"""
Optimiza public/data/buildings_line_coverage.geojson para reducir el tamaño:
  - Elimina el campo osm_id (no usado en frontend)
  - Reduce precisión de coordenadas de 5 a 4 decimales
  - Convierte lineas de JSON array string a string CSV

No requiere datos externos — lee y reescribe el GeoJSON existente.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IN_FILE = ROOT / "public" / "data" / "buildings_line_coverage.geojson"
OUT_FILE = IN_FILE  # sobreescribir in-place


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
    """Convierte lineas (JSON array string o lista) a CSV."""
    if not lineas_raw:
        return ""
    if isinstance(lineas_raw, str):
        try:
            items = json.loads(lineas_raw)
        except Exception:
            return lineas_raw
    else:
        items = lineas_raw
    return ",".join(str(x) for x in items)


def main():
    size_before = IN_FILE.stat().st_size / 1_048_576
    print(f"Leyendo {IN_FILE.name} ({size_before:.1f} MB)...")

    with open(IN_FILE, encoding="utf-8") as f:
        data = json.load(f)

    features_in = len(data["features"])
    print(f"  {features_in:,} features")

    optimized = []
    for feat in data["features"]:
        props = feat["properties"]
        optimized.append({
            "type": "Feature",
            "geometry": round_coords(feat["geometry"], precision=4),
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
    print(f"Reducción: {size_before:.1f} MB → {size_after:.1f} MB ({(1 - size_after/size_before)*100:.1f}%)")


if __name__ == "__main__":
    main()
