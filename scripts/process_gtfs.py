"""
Procesa el feed GTFS de la EMT en data/raw/GTFS/ y genera:
  - public/data/routes.geojson  (FeatureCollection con MultiLineString por línea)
  - public/data/routes_meta.json (lista compacta para el menú: id, nombre, color, modo)
  - public/data/stops.geojson   (FeatureCollection con Point por parada,
                                 incluye lista de route_ids que pasan por ella)
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GTFS_DIR = ROOT / "data" / "raw" / "GTFS_EMT"
OUT_DIR = ROOT / "public" / "data"


def require_files() -> None:
    needed = ["routes.txt", "trips.txt", "shapes.txt", "stops.txt"]
    missing = [f for f in needed if not (GTFS_DIR / f).exists()]
    if missing:
        raise FileNotFoundError(
            f"Faltan archivos GTFS en {GTFS_DIR}: {missing}. "
            "Descomprime el feed completo en esa carpeta."
        )


def load_shapes() -> dict[str, list[list[float]]]:
    """Devuelve {shape_id: [[lon, lat], ...]} ordenado por shape_pt_sequence."""
    df = pd.read_csv(
        GTFS_DIR / "shapes.txt",
        usecols=["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"],
        dtype={"shape_id": str},
    )
    df.sort_values(["shape_id", "shape_pt_sequence"], inplace=True)
    out: dict[str, list[list[float]]] = {}
    for shape_id, grp in df.groupby("shape_id", sort=False):
        coords = grp[["shape_pt_lon", "shape_pt_lat"]].to_numpy().tolist()
        out[shape_id] = coords
    return out


def load_route_to_shapes() -> dict[str, list[str]]:
    """{route_id: [shape_id únicos asociados a sus trips]}."""
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        usecols=["route_id", "shape_id"],
        dtype={"route_id": str, "shape_id": str},
    )
    trips = trips.dropna(subset=["shape_id"]).drop_duplicates()
    return (
        trips.groupby("route_id")["shape_id"]
        .apply(lambda s: sorted(set(s)))
        .to_dict()
    )


def load_routes() -> pd.DataFrame:
    df = pd.read_csv(
        GTFS_DIR / "routes.txt",
        dtype={"route_id": str, "route_short_name": str, "route_color": str},
    )
    df["route_color"] = df["route_color"].fillna("888888")
    df["route_short_name"] = df["route_short_name"].fillna("")
    df["route_long_name"] = df["route_long_name"].fillna("")
    return df


def build_geojson(
    routes: pd.DataFrame,
    route_to_shapes: dict[str, list[str]],
    shapes: dict[str, list[list[float]]],
) -> dict:
    features = []
    for _, r in routes.iterrows():
        shape_ids = route_to_shapes.get(r["route_id"], [])
        line_coords = [shapes[sid] for sid in shape_ids if sid in shapes]
        if not line_coords:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "MultiLineString", "coordinates": line_coords},
            "properties": {
                "route_id": r["route_id"],
                "route_short_name": r["route_short_name"],
                "route_long_name": r["route_long_name"],
                "route_color": r["route_color"],
                "route_type": int(r["route_type"]),
            },
        })
    return {"type": "FeatureCollection", "features": features}


def compute_stops_by_direction() -> dict[str, dict[str, int]]:
    """{route_id: {"0": n_stops_dir0, "1": n_stops_dir1}} con stops únicos por dirección."""
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        usecols=["trip_id", "route_id", "direction_id"],
        dtype={"trip_id": str, "route_id": str, "direction_id": str},
    )
    trip_to_route_dir: dict[str, tuple[str, str]] = {
        row["trip_id"]: (row["route_id"], str(row["direction_id"]))
        for _, row in trips.iterrows()
    }

    # {(route_id, direction_id): set(stop_ids)}
    route_dir_stops: dict[tuple[str, str], set[str]] = {}
    for chunk in pd.read_csv(
        GTFS_DIR / "stop_times.txt",
        usecols=["trip_id", "stop_id"],
        dtype=str,
        chunksize=500_000,
    ):
        for tid, sid in zip(chunk["trip_id"], chunk["stop_id"]):
            rd = trip_to_route_dir.get(tid)
            if rd is None:
                continue
            route_dir_stops.setdefault(rd, set()).add(sid)

    out: dict[str, dict[str, int]] = {}
    for (route_id, direction_id), stops in route_dir_stops.items():
        out.setdefault(route_id, {})[direction_id] = len(stops)
    return out


def build_meta(routes: pd.DataFrame, route_to_shapes: dict[str, list[str]], stops_by_dir: dict[str, dict[str, int]]) -> list[dict]:
    meta = []
    for _, r in routes.iterrows():
        if not route_to_shapes.get(r["route_id"]):
            continue
        entry = {
            "id": r["route_id"],
            "shortName": r["route_short_name"],
            "longName": r["route_long_name"],
            "color": r["route_color"],
            "type": int(r["route_type"]),
        }
        sc = stops_by_dir.get(r["route_id"])
        if sc:
            entry["stopsCount"] = sc
        meta.append(entry)

    def sort_key(m: dict):
        sn = m["shortName"]
        try:
            return (0, int(sn), sn)
        except ValueError:
            return (1, 0, sn)

    meta.sort(key=sort_key)
    return meta


def build_stops_geojson() -> dict:
    """Genera FeatureCollection de paradas con la lista de route_ids que pasan por ella."""
    print("Cargando stops...")
    stops = pd.read_csv(
        GTFS_DIR / "stops.txt",
        usecols=["stop_id", "stop_code", "stop_name", "stop_lat", "stop_lon"],
        dtype={"stop_id": str, "stop_code": str, "stop_name": str},
    )
    print(f"  {len(stops)} paradas")

    print("Cruzando stop_times con trips para obtener líneas por parada...")
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        usecols=["trip_id", "route_id"],
        dtype={"trip_id": str, "route_id": str},
    )
    trip_to_route = dict(zip(trips["trip_id"], trips["route_id"]))

    stop_to_routes: dict[str, set[str]] = {}
    for chunk in pd.read_csv(
        GTFS_DIR / "stop_times.txt",
        usecols=["trip_id", "stop_id"],
        dtype=str,
        chunksize=500_000,
    ):
        for tid, sid in zip(chunk["trip_id"], chunk["stop_id"]):
            r = trip_to_route.get(tid)
            if r is None:
                continue
            stop_to_routes.setdefault(sid, set()).add(r)

    features = []
    for _, s in stops.iterrows():
        sid = s["stop_id"]
        routes = sorted(stop_to_routes.get(sid, set()))
        if not routes:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(s["stop_lon"]), float(s["stop_lat"])]},
            "properties": {
                "stop_id": sid,
                "stop_code": s["stop_code"] if pd.notna(s["stop_code"]) else "",
                "stop_name": s["stop_name"],
                "routes": routes,
            },
        })
    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    require_files()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Cargando shapes...")
    shapes = load_shapes()
    print(f"  {len(shapes)} shapes únicos")

    print("Cargando trips -> shapes...")
    route_to_shapes = load_route_to_shapes()
    print(f"  {len(route_to_shapes)} líneas con shape")

    print("Cargando routes...")
    routes = load_routes()
    print(f"  {len(routes)} líneas en routes.txt")

    print("Calculando paradas por línea y dirección...")
    stops_by_dir = compute_stops_by_direction()
    print(f"  {len(stops_by_dir)} líneas con datos de paradas")

    print("Construyendo GeoJSON de líneas...")
    geojson = build_geojson(routes, route_to_shapes, shapes)
    meta = build_meta(routes, route_to_shapes, stops_by_dir)

    geojson_path = OUT_DIR / "routes.geojson"
    meta_path = OUT_DIR / "routes_meta.json"
    with geojson_path.open("w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, separators=(",", ":"))
    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    print(f"OK -> {geojson_path.relative_to(ROOT)} ({geojson_path.stat().st_size / 1e6:.1f} MB)")
    print(f"OK -> {meta_path.relative_to(ROOT)} ({len(meta)} líneas)")

    stops_geojson = build_stops_geojson()
    stops_path = OUT_DIR / "stops.geojson"
    with stops_path.open("w", encoding="utf-8") as f:
        json.dump(stops_geojson, f, ensure_ascii=False, separators=(",", ":"))
    print(
        f"OK -> {stops_path.relative_to(ROOT)} "
        f"({stops_path.stat().st_size / 1e6:.2f} MB, {len(stops_geojson['features'])} paradas)"
    )


if __name__ == "__main__":
    main()
