"""
Descarga los carriles bus de Madrid desde OpenStreetMap usando osmnx
y los guarda como GeoPackage en data/raw/carriles_bus.gpkg.

Fuente: OpenStreetMap (tags: busway, bus:lanes, lanes:bus)
Zona: municipio de Madrid (boundary=administrative, admin_level=8)

Requisitos:
    pip install osmnx geopandas shapely

Uso:
    python scripts/descargar_carriles_bus_madrid.py
"""

from __future__ import annotations
from pathlib import Path
import geopandas as gpd
import osmnx as ox

ROOT        = Path(__file__).resolve().parents[1]
OUTPUT_FILE = ROOT / "data" / "raw" / "carriles_bus.gpkg"
LAYER_NAME  = "carriles_bus"

# Tags OSM que identifican carriles bus
USEFUL_TAGS_WAY = [
    "name", "highway", "busway", "bus:lanes", "bus:lanes:forward",
    "bus:lanes:backward", "lanes", "oneway", "maxspeed",
]


def main():
    print("Descargando red vial de Madrid con tags de carril bus desde OSM...")
    ox.settings.useful_tags_way = USEFUL_TAGS_WAY

    # Descargar la red de calles del municipio de Madrid filtrando por tags de bus
    # custom_filter selecciona vías que tengan alguno de los tags de carril bus
    custom_filter = (
        '["highway"]["busway"]'
        '|["highway"]["bus:lanes"]'
        '|["highway"]["bus:lanes:forward"]'
        '|["highway"]["bus:lanes:backward"]'
    )

    print("  Consultando Overpass (puede tardar 1-2 min)...")
    G = ox.graph_from_place(
        "Madrid, Spain",
        custom_filter=custom_filter,
        retain_all=True,
    )

    # Convertir a GeoDataFrame de edges (linestrings)
    _, edges = ox.graph_to_gdfs(G)

    # Reproyectar a EPSG:25830 (CRS métrico español)
    edges = edges.to_crs("EPSG:25830")

    # Conservar solo columnas útiles
    keep_cols = [c for c in ["name", "highway", "busway", "bus:lanes",
                              "bus:lanes:forward", "bus:lanes:backward",
                              "lanes", "oneway", "geometry"] if c in edges.columns]
    edges = edges[keep_cols].reset_index(drop=True)

    print(f"  -> {len(edges)} segmentos de carril bus encontrados")
    print(f"  Tipos de busway: {edges['busway'].value_counts().to_string() if 'busway' in edges.columns else 'n/a'}")

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    edges.to_file(OUTPUT_FILE, layer=LAYER_NAME, driver="GPKG")
    print(f"\n-> Guardado: {OUTPUT_FILE}  (capa '{LAYER_NAME}', CRS: EPSG:25830)")


if __name__ == "__main__":
    main()
