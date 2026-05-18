"""
Genera public/data/route_buffers.fgb a partir de madrid_bus_coverage.gpkg.

Exporta la capa route_buffers (isocronas peatonales por linea y distancia)
reproyectada a WGS84 como FlatGeobuf con indice espacial R-tree.

Campos exportados: route_id (string), distance_m (int)
Geometria: MultiPolygon en EPSG:4326

Uso:
  python scripts/generate_route_buffers_fgb.py [ruta_gpkg]

Ejemplo:
  python scripts/generate_route_buffers_fgb.py C:/Users/malvarezm/Documents/asignador_poblacion/output/madrid_bus_coverage.gpkg
"""
from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "public" / "data" / "route_buffers.fgb"

DEFAULT_GPKG = Path(r"C:\Users\malvarezm\Documents\asignador_poblacion\output\madrid_bus_coverage.gpkg")


def generate(gpkg_path: Path) -> None:
    print(f"Leyendo {gpkg_path} / capa route_buffers...")
    gdf = gpd.read_file(gpkg_path, layer="route_buffers")
    print(f"  {len(gdf):,} filas, CRS: {gdf.crs}")
    print(f"  Columnas: {list(gdf.columns)}")

    print("Reproyectando a WGS84...")
    gdf84 = gdf.to_crs("EPSG:4326")

    cols = [c for c in ["route_id", "distance_m"] if c in gdf84.columns]
    if not cols:
        alt = [c for c in gdf84.columns if c != "geometry"]
        print(f"  AVISO: columnas esperadas no encontradas. Disponibles: {alt}")
        cols = alt[:2]

    out = gdf84[cols + ["geometry"]].copy()
    print(f"  Columnas exportadas: {cols}")

    # Simplificar geometria para reducir tamano: tolerancia ~50m en grados (~0.00045 deg)
    print("Simplificando geometria (tolerancia 50 m)...")
    out["geometry"] = out["geometry"].simplify(tolerance=0.00045, preserve_topology=True)
    size_before = sum(len(str(g)) for g in out["geometry"]) / 1e6
    print(f"  Tamano estimado geometrias: {size_before:.1f} M chars")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"Escribiendo {OUT_PATH}...")
    out.to_file(OUT_PATH, driver="FlatGeobuf")

    size_mb = OUT_PATH.stat().st_size / 1_000_000
    print(f"  Escrito: {size_mb:.1f} MB, {len(out):,} poligonos")


if __name__ == "__main__":
    gpkg = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_GPKG
    if not gpkg.exists():
        print(f"No encontrado: {gpkg}")
        sys.exit(1)
    generate(gpkg)
