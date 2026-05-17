"""
Procesa los feeds GTFS de Metro y Cercanias del CRTM y genera:
  - public/data/metro_cercanias_routes.geojson
      FeatureCollection de LineStrings por linea, con props:
      { route_id, route_short_name, route_long_name, route_color, mode }
  - public/data/metro_cercanias_stops.geojson
      FeatureCollection de Points por estacion, con props:
      { stop_id, stop_name, routes, mode }

Nota: el GTFS de Cercanias del CRTM no incluye shapes ni trips (feed parcial),
por lo que solo se generan paradas para ese modo, no lineas.

Requiere:
  data/raw/GTFS_Metro/     (routes.txt, trips.txt, shapes.txt, stops.txt, stop_times.txt)
  data/raw/GTFS_Cercanias/ (routes.txt, stops.txt — shapes/trips pueden estar vacios)

Uso:
    python scripts/process_metro_cercanias.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "data"

SOURCES: dict[str, Path] = {
    "metro": ROOT / "data" / "raw" / "GTFS_Metro",
    "cercanias": ROOT / "data" / "raw" / "GTFS_Cercanias",
}

METRO_FALLBACK: dict[str, str] = {
    "1": "00A8E1", "2": "F00000", "3": "FFD700", "4": "964B00",
    "5": "99CC33", "6": "999999", "7": "FF8000", "8": "FF66FF",
    "9": "9B59B6", "10": "003893", "11": "008000", "12": "A5D8F3",
    "R": "0070C0", "ML1": "BB3D96", "ML2": "BB3D96", "ML3": "BB3D96",
}
CERCANIAS_FALLBACK: dict[str, str] = {
    "C1": "4FB0E5", "C2": "008B45", "C3": "9F2E86", "C4": "004A98",
    "C4A": "004A98", "C4B": "004A98", "C5": "F5BF00", "C7": "E07000",
    "C8": "A3006F", "C9": "009E3E", "C10": "007BB9",
}
CERCANIAS_DEFAULT_COLOR = "4FB0E5"


def check_source(mode: str, gtfs_dir: Path) -> bool:
    if not (gtfs_dir / "routes.txt").exists():
        print(f"[{mode}] No se encuentra {gtfs_dir / 'routes.txt'}")
        print(f"  Ejecuta primero: python scripts/download_gtfs_crtm.py")
        return False
    return True


def load_shapes(gtfs_dir: Path) -> dict[str, list[list[float]]]:
    path = gtfs_dir / "shapes.txt"
    df = pd.read_csv(
        path,
        usecols=["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"],
        dtype={"shape_id": str},
    )
    if df.empty:
        return {}
    df.sort_values(["shape_id", "shape_pt_sequence"], inplace=True)
    out: dict[str, list[list[float]]] = {}
    for shape_id, grp in df.groupby("shape_id", sort=False):
        coords = grp[["shape_pt_lon", "shape_pt_lat"]].to_numpy().tolist()
        out[shape_id] = coords
    return out


def load_route_to_shapes(gtfs_dir: Path) -> dict[str, list[str]]:
    path = gtfs_dir / "trips.txt"
    trips = pd.read_csv(
        path,
        usecols=["route_id", "shape_id"],
        dtype={"route_id": str, "shape_id": str},
    )
    if trips.empty:
        return {}
    trips = trips.dropna(subset=["shape_id"]).drop_duplicates()
    return (
        trips.groupby("route_id")["shape_id"]
        .apply(lambda s: sorted(set(s)))
        .to_dict()
    )


def pick_color(row: pd.Series, mode: str) -> str:
    color = str(row.get("route_color", "") or "").strip().upper()
    if color and color not in ("FFFFFF", "000000", ""):
        return color
    name = str(row.get("route_short_name", "") or "").strip()
    fallback = METRO_FALLBACK if mode == "metro" else CERCANIAS_FALLBACK
    return fallback.get(name, CERCANIAS_DEFAULT_COLOR if mode == "cercanias" else "888888")


def process_routes(mode: str, gtfs_dir: Path) -> tuple[list[dict], set[str], dict[str, str]]:
    """Devuelve (route_features, route_ids_con_geometria, route_color_map)."""
    routes = pd.read_csv(
        gtfs_dir / "routes.txt",
        dtype={"route_id": str, "route_short_name": str, "route_color": str},
    )
    shapes = load_shapes(gtfs_dir)
    route_to_shapes = load_route_to_shapes(gtfs_dir)

    route_features = []
    route_ids_with_geom: set[str] = set()
    route_color_map: dict[str, str] = {}

    for _, r in routes.iterrows():
        route_id = str(r["route_id"])
        color = pick_color(r, mode)
        route_color_map[route_id] = color

        shape_ids = route_to_shapes.get(route_id, [])
        lines = [shapes[sid] for sid in shape_ids if sid in shapes]
        if not lines:
            continue

        route_ids_with_geom.add(route_id)
        route_features.append({
            "type": "Feature",
            "geometry": {"type": "MultiLineString", "coordinates": lines},
            "properties": {
                "route_id": route_id,
                "route_short_name": str(r.get("route_short_name", "") or ""),
                "route_long_name": str(r.get("route_long_name", "") or ""),
                "route_color": color,
                "mode": mode,
            },
        })

    print(f"[{mode}] {len(route_features)} lineas con geometria.")
    return route_features, route_ids_with_geom, route_color_map


def process_stops(
    mode: str,
    gtfs_dir: Path,
    route_color_map: dict[str, str],
) -> list[dict]:
    """
    Genera features de paradas. Si hay stop_times, asocia rutas exactas.
    Si no, incluye todas las paradas del feed con mode=mode.
    """
    stops = pd.read_csv(gtfs_dir / "stops.txt", dtype={"stop_id": str})

    stop_routes_map: dict[str, list[str]] = {}
    stop_times_path = gtfs_dir / "stop_times.txt"
    trips_path = gtfs_dir / "trips.txt"

    if stop_times_path.exists() and trips_path.exists():
        trips = pd.read_csv(
            trips_path,
            usecols=["trip_id", "route_id"],
            dtype={"trip_id": str, "route_id": str},
        )
        stop_times = pd.read_csv(
            stop_times_path,
            usecols=["trip_id", "stop_id"],
            dtype={"trip_id": str, "stop_id": str},
        )
        if not trips.empty and not stop_times.empty:
            merged = stop_times.merge(trips, on="trip_id")
            valid_routes = set(route_color_map.keys())
            merged = merged[merged["route_id"].isin(valid_routes)]
            stop_routes_map = (
                merged.groupby("stop_id")["route_id"]
                .apply(lambda s: sorted(set(s)))
                .to_dict()
            )

    stop_features = []
    all_routes = sorted(route_color_map.keys())

    for _, s in stops.iterrows():
        stop_id = str(s["stop_id"])
        lat, lon = float(s.get("stop_lat", 0) or 0), float(s.get("stop_lon", 0) or 0)
        if lat == 0 and lon == 0:
            continue

        routes_for_stop = stop_routes_map.get(stop_id, all_routes if not stop_routes_map else [])
        if not routes_for_stop:
            continue

        stop_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "stop_id": stop_id,
                "stop_name": str(s.get("stop_name", "") or ""),
                "routes": routes_for_stop,
                "mode": mode,
            },
        })

    print(f"[{mode}] {len(stop_features)} estaciones.")
    return stop_features


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    all_route_features: list[dict] = []
    all_stop_features: list[dict] = []

    available = False
    for mode, gtfs_dir in SOURCES.items():
        if not check_source(mode, gtfs_dir):
            continue
        available = True
        print(f"\n[{mode}] Procesando {gtfs_dir.name} ...")
        rf, _, color_map = process_routes(mode, gtfs_dir)
        sf = process_stops(mode, gtfs_dir, color_map)
        all_route_features.extend(rf)
        all_stop_features.extend(sf)

    if not available:
        print("\nNo hay datos. Ejecuta download_gtfs_crtm.py primero.")
        return

    out_routes = OUT_DIR / "metro_cercanias_routes.geojson"
    out_stops = OUT_DIR / "metro_cercanias_stops.geojson"

    out_routes.write_text(
        json.dumps({"type": "FeatureCollection", "features": all_route_features}, ensure_ascii=False),
        encoding="utf-8",
    )
    out_stops.write_text(
        json.dumps({"type": "FeatureCollection", "features": all_stop_features}, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"\nGenerado: {out_routes} ({len(all_route_features)} lineas)")
    print(f"Generado: {out_stops} ({len(all_stop_features)} estaciones)")
    print("Listo.")


if __name__ == "__main__":
    main()
