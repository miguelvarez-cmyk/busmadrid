"""
Descarga los trazados de las lineas de Cercanias Madrid desde OpenStreetMap
via Overpass API e inyecta las geometrias en el GTFS de Cercanias como shapes.

Tras ejecutar este script, vuelve a ejecutar process_metro_cercanias.py para
regenerar el GeoJSON con las lineas de Cercanias.

Uso:
    python scripts/fetch_cercanias_shapes_osm.py

Salida:
    data/raw/GTFS_Cercanias/shapes.txt   (reemplazado con geometrias OSM)
    data/raw/GTFS_Cercanias/trips.txt    (reemplazado, un trip por linea)
"""
from __future__ import annotations

import csv
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CERCANIAS_DIR = ROOT / "data" / "raw" / "GTFS_Cercanias"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Colores oficiales por linea (hex sin #)
LINE_COLORS: dict[str, str] = {
    "C1": "4FB0E5",
    "C2": "008B45",
    "C3": "9F2E86",
    "C4": "004A98",
    "C4A": "004A98",
    "C4B": "004A98",
    "C5": "F5BF00",
    "C7": "E07000",
    "C8": "A3006F",
    "C9": "009E3E",
    "C10": "007BB9",
}

# Consulta Overpass: relaciones de tipo 'route' con network=Cercanias Madrid
# Devuelve todas las vias (ways) que forman cada linea con sus nodos
OVERPASS_QUERY = """
[out:json][timeout:120];
(
  relation["type"="route"]["route"="train"]["network"~"Cercan.as Madrid",i];
  relation["type"="route"]["route"="train"]["operator"~"Renfe",i]["network"~"Madrid",i];
);
out body;
>;
out skel qt;
"""


def overpass_fetch(query: str) -> dict:
    encoded = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(
        OVERPASS_URL,
        data=encoded,
        headers={"User-Agent": "cercanias-shapes-fetcher/1.0"},
    )
    print("Consultando Overpass API ...")
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read())


def build_node_index(elements: list[dict]) -> dict[int, tuple[float, float]]:
    return {
        e["id"]: (e["lat"], e["lon"])
        for e in elements
        if e["type"] == "node"
    }


def way_coords(
    way: dict, nodes: dict[int, tuple[float, float]]
) -> list[tuple[float, float]]:
    return [nodes[nid] for nid in way.get("nodes", []) if nid in nodes]


def extract_line_name(tags: dict) -> str | None:
    """
    Extrae el nombre normalizado de linea de los tags OSM.
    Soporta formatos: 'C1', 'C-1', 'Tren C-1:', 'C4a', 'C-4b', etc.
    Devuelve siempre sin guion: 'C1', 'C4A', 'C4B', etc.
    """
    import re
    # El tag 'ref' suele ser lo mas limpio, ej: "C-1", "C-4a"
    for key in ("ref", "name", "short_name"):
        val = tags.get(key, "")
        # Patron: C seguido de guion opcional, digitos, y posible A/B
        m = re.search(r"\bC-?(\d+)([AB])?\b", val, re.IGNORECASE)
        if m:
            num = m.group(1)
            suffix = (m.group(2) or "").upper()
            return f"C{num}{suffix}"
    return None


def relations_to_shapes(
    data: dict,
) -> dict[str, list[list[tuple[float, float]]]]:
    """
    Agrupa las geometrias por nombre de linea.
    Devuelve { line_name: [ [(lat,lon), ...], ... ] }  (multiples segmentos por linea)
    """
    nodes = build_node_index(data["elements"])
    ways_by_id = {
        e["id"]: e
        for e in data["elements"]
        if e["type"] == "way"
    }

    lines: dict[str, list[list[tuple[float, float]]]] = {}

    for rel in data["elements"]:
        if rel["type"] != "relation":
            continue
        name = extract_line_name(rel.get("tags", {}))
        if name is None:
            continue

        segments: list[list[tuple[float, float]]] = []
        for member in rel.get("members", []):
            if member["type"] != "way":
                continue
            way = ways_by_id.get(member["ref"])
            if way is None:
                continue
            coords = way_coords(way, nodes)
            if coords:
                segments.append(coords)

        if segments:
            if name not in lines:
                lines[name] = []
            lines[name].extend(segments)

    return lines


def write_shapes_csv(
    lines: dict[str, list[list[tuple[float, float]]]], out_path: Path
) -> dict[str, str]:
    """
    Escribe shapes.txt. Devuelve { route_short_name: shape_id }.
    Cada linea tiene un unico shape_id; los segmentos se concatenan en orden.
    """
    route_to_shape: dict[str, str] = {}
    rows: list[dict] = []

    for line_name, segments in sorted(lines.items()):
        shape_id = f"osm_{line_name}"
        route_to_shape[line_name] = shape_id
        seq = 1
        for seg in segments:
            for lat, lon in seg:
                rows.append({
                    "shape_id": shape_id,
                    "shape_pt_lat": f"{lat:.7f}",
                    "shape_pt_lon": f"{lon:.7f}",
                    "shape_pt_sequence": seq,
                })
                seq += 1

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"  shapes.txt: {len(rows)} puntos para {len(route_to_shape)} lineas")
    return route_to_shape


def write_trips_csv(
    routes_path: Path,
    route_to_shape: dict[str, str],
    out_path: Path,
) -> None:
    """
    Lee routes.txt y genera trips.txt con un trip por linea que tenga shape.
    """
    with routes_path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        routes = list(reader)

    trips: list[dict] = []
    for r in routes:
        name = str(r.get("route_short_name", "")).strip().upper()
        shape_id = route_to_shape.get(name)
        if shape_id is None:
            # C8 del GTFS puede estar en OSM como C8A o C8B: usar la primera que exista
            for candidate in [name + "A", name + "B", name.rstrip("AB")]:
                shape_id = route_to_shape.get(candidate)
                if shape_id:
                    break
        if shape_id is None:
            print(f"  [aviso] No se encontro shape OSM para linea '{name}' (route_id={r.get('route_id')})")
            continue

        trips.append({
            "route_id": r["route_id"],
            "service_id": "LABORABLE",
            "trip_id": f"trip_{r['route_id']}_0",
            "trip_headsign": r.get("route_long_name", ""),
            "trip_short_name": name,
            "direction_id": "0",
            "block_id": "",
            "shape_id": shape_id,
            "wheelchair_accessible": "0",
        })

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "route_id", "service_id", "trip_id", "trip_headsign",
                "trip_short_name", "direction_id", "block_id", "shape_id",
                "wheelchair_accessible",
            ],
        )
        writer.writeheader()
        writer.writerows(trips)

    print(f"  trips.txt: {len(trips)} trips generados")


def main() -> None:
    if not (CERCANIAS_DIR / "routes.txt").exists():
        print("No se encuentra data/raw/GTFS_Cercanias/routes.txt")
        print("Ejecuta primero: python scripts/download_gtfs_crtm.py")
        return

    data = overpass_fetch(OVERPASS_QUERY)
    time.sleep(1)  # cortesia hacia el servidor

    relations = [e for e in data["elements"] if e["type"] == "relation"]
    print(f"Relaciones encontradas: {len(relations)}")
    for r in relations:
        name = extract_line_name(r.get("tags", {}))
        rel_name = r['tags'].get('name', '').encode('ascii', 'replace').decode()
        print(f"  {name or '???'} - {rel_name}")

    lines = relations_to_shapes(data)
    print(f"\nLineas con geometria: {sorted(lines.keys())}")

    shapes_path = CERCANIAS_DIR / "shapes.txt"
    trips_path = CERCANIAS_DIR / "trips.txt"

    route_to_shape = write_shapes_csv(lines, shapes_path)
    write_trips_csv(CERCANIAS_DIR / "routes.txt", route_to_shape, trips_path)

    print("\nListo. Ahora ejecuta:")
    print("  python scripts/process_metro_cercanias.py")


if __name__ == "__main__":
    main()
