"""
Procesa el feed GTFS de la EMT en data/raw/GTFS/ y genera:
  - public/data/routes.geojson  (FeatureCollection con MultiLineString por línea)
  - public/data/routes_meta.json (lista compacta para el menú: id, nombre, color, modo)

Cada feature de routes.geojson agrega todos los shapes únicos asociados a una línea
(ambos sentidos) en un MultiLineString. Las propiedades incluyen route_id,
route_short_name, route_long_name, route_color, route_type.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GTFS_DIR = ROOT / "data" / "raw" / "GTFS"
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


def build_meta(routes: pd.DataFrame, route_to_shapes: dict[str, list[str]]) -> list[dict]:
    meta = []
    for _, r in routes.iterrows():
        if not route_to_shapes.get(r["route_id"]):
            continue
        meta.append({
            "id": r["route_id"],
            "shortName": r["route_short_name"],
            "longName": r["route_long_name"],
            "color": r["route_color"],
            "type": int(r["route_type"]),
        })

    def sort_key(m: dict):
        sn = m["shortName"]
        try:
            return (0, int(sn), sn)
        except ValueError:
            return (1, 0, sn)

    meta.sort(key=sort_key)
    return meta


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

    print("Construyendo GeoJSON...")
    geojson = build_geojson(routes, route_to_shapes, shapes)
    meta = build_meta(routes, route_to_shapes)

    geojson_path = OUT_DIR / "routes.geojson"
    meta_path = OUT_DIR / "routes_meta.json"
    with geojson_path.open("w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, separators=(",", ":"))
    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    print(f"OK -> {geojson_path.relative_to(ROOT)} ({geojson_path.stat().st_size / 1e6:.1f} MB)")
    print(f"OK -> {meta_path.relative_to(ROOT)} ({len(meta)} líneas)")


if __name__ == "__main__":
    main()
