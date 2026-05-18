"""
Genera public/data/edificios_poblacion.fgb a partir de la salida del
asignador_poblacion (madrid_edificios_poblacion.fgb en EPSG:25830).

Reproyecta a WGS84 y conserva solo el campo `poblacion` para minimizar el
tamaño del archivo. La capa se carga en el browser con streaming HTTP range
requests usando la librería flatgeobuf.

Uso:
  python scripts/generate_buildings_fgb.py <ruta_al_madrid_edificios_poblacion.fgb>

Ejemplo:
  python scripts/generate_buildings_fgb.py C:/Users/malvarezm/Documents/asignador_poblacion/output/madrid_edificios_poblacion.fgb
"""
from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "public" / "data" / "edificios_poblacion.fgb"


def generate(input_path: Path) -> None:
    print(f"Leyendo {input_path}...")
    gdf = gpd.read_file(input_path)
    print(f"  {len(gdf):,} edificios · CRS: {gdf.crs}")

    print("Reproyectando a WGS84...")
    gdf84 = gdf.to_crs("EPSG:4326")

    out = gdf84[["poblacion", "geometry"]].copy()
    out["poblacion"] = out["poblacion"].round(1)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"Escribiendo {OUT_PATH}...")
    out.to_file(OUT_PATH, driver="FlatGeobuf")

    size_mb = OUT_PATH.stat().st_size / 1_000_000
    print(f"  Escrito: {size_mb:.1f} MB · {len(out):,} edificios")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        default = Path(r"C:\Users\malvarezm\Documents\asignador_poblacion\output\madrid_edificios_poblacion.fgb")
        if default.exists():
            generate(default)
        else:
            print("Uso: python scripts/generate_buildings_fgb.py <ruta_al_fgb>")
            sys.exit(1)
    else:
        generate(Path(sys.argv[1]))
