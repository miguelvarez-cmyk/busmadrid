"""
Descarga la capa "Bandas de Aparcamiento" del Servicio de Estacionamiento
Regulado (SER) de Madrid desde SIGMA y la guarda como GeoPackage.

Fuente:
  https://sigma.madrid.es/hosted/rest/services/MOVILIDAD/
  SERVICIO_DE_ESTACIONAMIENTO_REGULADO_prueba/MapServer/4

Campos disponibles:
  - Color           - tipo de plaza (Azul, Verde, Alta Rotacion, Rojo, Naranja)
  - Bateria_Linea   - tipo de aparcamiento (bateria / linea)
  - Res_NumPlazas   - numero de plazas del tramo
  - OBJECTID        - identificador

Cobertura: zona SER de Madrid (interior aproximado de la M-30).
AVISO: el servicio lleva el sufijo "_prueba"; usalo con cautela.

Requisitos:
    pip install requests geopandas shapely

Uso:
    python descargar_aparcamiento_ser_madrid.py
"""

import requests
import geopandas as gpd
import time
from pathlib import Path

ROOT        = Path(__file__).resolve().parents[1]
BASE_URL    = (
    "https://sigma.madrid.es/hosted/rest/services/MOVILIDAD/"
    "SERVICIO_DE_ESTACIONAMIENTO_REGULADO_prueba/MapServer/4"
)
QUERY_URL   = f"{BASE_URL}/query"
PAGE_SIZE   = 1000
OUTPUT_FILE = ROOT / "data" / "raw" / "aparcamiento_ser.gpkg"
LAYER_NAME  = "bandas_aparcamiento"
CRS         = "EPSG:25830"


def get_total_count() -> int:
    r = requests.get(
        QUERY_URL,
        params={"where": "1=1", "returnCountOnly": "true", "f": "json"},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"Error del servicio: {data['error']}")
    return data["count"]


def fetch_page(offset: int) -> list[dict]:
    r = requests.get(
        QUERY_URL,
        params={
            "where": "1=1",
            "outFields": "*",
            "resultOffset": offset,
            "resultRecordCount": PAGE_SIZE,
            "returnGeometry": "true",
            "outSR": "25830",
            "f": "geojson",
        },
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"Error en offset {offset}: {data['error']}")
    return data.get("features", [])


def main():
    print("Consultando numero total de entidades...")
    total = get_total_count()
    print(f"  -> {total} tramos encontrados")

    all_features = []
    offset, page = 0, 1

    while offset < total:
        print(f"  Pagina {page} (offset {offset})...", end=" ", flush=True)
        features = fetch_page(offset)
        if not features:
            print("sin datos, fin.")
            break
        all_features.extend(features)
        print(f"{len(features)} tramos (total: {len(all_features)})")
        offset += PAGE_SIZE
        page += 1
        time.sleep(0.3)

    print(f"\nTotal descargado: {len(all_features)} tramos")

    gdf = gpd.GeoDataFrame.from_features(
        {"type": "FeatureCollection", "features": all_features},
        crs=CRS,
    )

    print("\nResumen por color de plaza:")
    print(gdf["Color"].value_counts().to_string())
    print(f"\nTotal plazas (suma Res_NumPlazas): {gdf['Res_NumPlazas'].sum():,}")

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(OUTPUT_FILE, layer=LAYER_NAME, driver="GPKG")
    print(f"\n-> Guardado: {OUTPUT_FILE}  (capa '{LAYER_NAME}', CRS: {CRS})")


if __name__ == "__main__":
    main()
