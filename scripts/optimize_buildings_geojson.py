"""
Optimiza public/data/buildings_line_coverage.geojson para reducir el tamaño:
  - Simplifica geometrías con shapely (tolerancia 0.00005°, ~5m en Madrid)
  - Reduce precisión de coordenadas a 4 decimales
  - Convierte lineas de JSON array string a string CSV
  - Elimina el campo osm_id (no usado en frontend)

No requiere datos externos — lee y reescribe el GeoJSON existente.
"""

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import mapping

ROOT = Path(__file__).resolve().parents[1]
IN_FILE = ROOT / "public" / "data" / "buildings_line_coverage.geojson"
OUT_FILE = IN_FILE  # sobreescribir in-place

SIMPLIFY_TOLERANCE = 0.0002  # ~22m en latitud/longitud a 40°N — aceptable para cobertura


def round_coords(geom: dict, precision: int = 4) -> dict:
    t = geom["type"]
    c = geom["coordinates"]
    if t == "Point":
        return {"type": t, "coordinates": [round(v, precision) for v in c]}
    if t in ("MultiPoint", "LineString"):
        return {"type": t, "coordinates": [[round(v, precision) for v in pt] for pt in c]}
    if t in ("MultiLineString", "Polygon"):
        return {"type": t, "coordinates": [[[round(v, precision) for v in pt] for pt in ring] for ring in c]}
    if t == "MultiPolygon":
        return {"type": t, "coordinates": [[[[round(v, precision) for v in pt] for pt in ring] for ring in poly] for poly in c]}
    return geom


def lineas_to_csv(lineas_raw) -> str:
    """Convierte lineas (JSON array string, lista o escalar) a CSV."""
    if not lineas_raw and lineas_raw != 0:
        return ""
    if isinstance(lineas_raw, (int, float)):
        return str(lineas_raw)
    if isinstance(lineas_raw, str):
        try:
            items = json.loads(lineas_raw)
        except Exception:
            return lineas_raw
    else:
        items = lineas_raw
    if isinstance(items, (int, float)):
        return str(items)
    return ",".join(str(x) for x in items)


def main():
    size_before = IN_FILE.stat().st_size / 1_048_576
    print(f"Leyendo {IN_FILE.name} ({size_before:.1f} MB)...")

    gdf = gpd.read_file(IN_FILE)
    features_in = len(gdf)
    print(f"  {features_in:,} features")

    pts_before = sum(
        len(list(geom.geoms)) if hasattr(geom, "geoms") else 1
        for geom in gdf.geometry
    )

    print(f"  Simplificando geometrias (tolerancia={SIMPLIFY_TOLERANCE})...")
    gdf["geometry"] = gdf["geometry"].simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)

    pts_after = sum(
        len(list(geom.exterior.coords)) if geom.geom_type == "Polygon"
        else sum(len(p.exterior.coords) for p in geom.geoms) if geom.geom_type == "MultiPolygon"
        else 0
        for geom in gdf.geometry
    )
    print(f"  Puntos de coordenadas: {pts_before:,} -> {pts_after:,} ({(1 - pts_after/max(pts_before,1))*100:.1f}% reduccion)")

    optimized = []
    for _, row in gdf.iterrows():
        props = row.drop("geometry").to_dict()
        geom_dict = round_coords(mapping(row.geometry), precision=4)
        optimized.append({
            "type": "Feature",
            "geometry": geom_dict,
            "properties": {
                "address":   props.get("address", ""),
                "poblacion": props.get("poblacion", 0),
                "n_lineas":  props.get("n_lineas", 0),
                "lineas":    lineas_to_csv(props.get("lineas", "")),
            },
        })

    out = {"type": "FeatureCollection", "features": optimized}
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)

    size_after = OUT_FILE.stat().st_size / 1_048_576
    print(f"Escrito: {OUT_FILE.name} ({size_after:.1f} MB, {len(optimized):,} features)")
    pct = (1 - size_after / size_before) * 100
    print(f"Reduccion: {size_before:.1f} MB -> {size_after:.1f} MB ({pct:.1f}%)")


if __name__ == "__main__":
    main()
