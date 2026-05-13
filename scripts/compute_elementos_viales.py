"""
compute_elementos_viales.py

Genera a partir de los GeoPackages descargados:
  public/data/bus_lanes.geojson     -- carriles bus (linestrings)
  public/data/parking_bands.geojson -- bandas SER cerca de rutas de bus

Entradas:
  data/raw/carriles_bus.gpkg        (EPSG:25830)
  data/raw/aparcamiento_ser.gpkg    (EPSG:25830)
  public/data/routes.geojson        (EPSG:4326)

Uso:
  python scripts/compute_elementos_viales.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import geopandas as gpd
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
RAW  = ROOT / "data" / "raw"
OUT  = ROOT / "public" / "data"

BUFFER_M = 30   # metros: banda SER debe estar dentro de este radio de una ruta

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def _cross_z(dir_v: np.ndarray, to_park: np.ndarray) -> float:
    """Producto vectorial 2-D (componente z). Positivo = to_park esta a la izquierda de dir_v."""
    return float(dir_v[0] * to_park[1] - dir_v[1] * to_park[0])


def _side_of_route(park_geom, route_geom) -> str:
    """
    Devuelve 'right' o 'left' segun si el centroide del tramo de aparcamiento
    esta a la derecha o izquierda del sentido de marcha de la ruta.

    Se usa el vector de direccion del sub-tramo de ruta mas cercano.
    En EPSG:25830, Y crece hacia el norte igual que en coordenadas matematicas,
    por lo que z > 0 => izquierda.
    """
    if route_geom.geom_type == "MultiLineString":
        parts = list(route_geom.geoms)
        dists = [park_geom.distance(p) for p in parts]
        route_line = parts[int(np.argmin(dists))]
    else:
        route_line = route_geom

    coords = list(route_line.coords)
    if len(coords) < 2:
        return "right"

    # Vector de direccion: primer -> ultimo punto del sub-tramo
    dir_v = np.array(coords[-1]) - np.array(coords[0])

    # Punto medio del tramo de ruta como origen
    mid_idx = len(coords) // 2
    route_mid = np.array(coords[mid_idx])

    park_c = np.array(park_geom.centroid.coords[0])
    to_park = park_c - route_mid

    z = _cross_z(dir_v, to_park)
    return "left" if z > 0 else "right"


# ---------------------------------------------------------------------------
# Paso 1: carriles bus
# ---------------------------------------------------------------------------

def process_bus_lanes():
    path = RAW / "carriles_bus.gpkg"
    if not path.exists():
        print(f"  AVISO: {path} no existe. Ejecuta descargar_carriles_bus_madrid.py primero.")
        return

    gdf = gpd.read_file(path)

    # Descartar geometrias nulas o vacías
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty].copy()

    gdf = gdf.to_crs("EPSG:4326")

    # Conservar solo campos de etiqueta relevantes (OSM u otros según origen)
    label_candidates = ["name", "DENOMINACI", "Calles", "busway", "highway"]
    keep = [c for c in label_candidates if c in gdf.columns] + ["geometry"]
    gdf = gdf[keep]

    out_path = OUT / "bus_lanes.geojson"
    gdf.to_file(out_path, driver="GeoJSON")
    print(f"bus_lanes.geojson: {len(gdf)} features -> {out_path}")


# ---------------------------------------------------------------------------
# Paso 2: bandas de aparcamiento SER
# ---------------------------------------------------------------------------

def process_parking_bands():
    park_path   = RAW / "aparcamiento_ser.gpkg"
    routes_path = OUT / "routes.geojson"

    if not park_path.exists():
        print(f"  AVISO: {park_path} no existe. Ejecuta descargar_aparcamiento_ser_madrid.py primero.")
        return
    if not routes_path.exists():
        print(f"  AVISO: {routes_path} no existe. Ejecuta process_gtfs.py primero.")
        return

    print("Cargando rutas y aparcamiento...")
    routes_gdf = gpd.read_file(routes_path).to_crs("EPSG:25830")
    park_gdf   = gpd.read_file(park_path)   # ya en EPSG:25830

    routes_sindex = routes_gdf.sindex

    features_out = []
    skipped_no_route = 0
    count_right = 0
    count_both  = 0
    count_left_dropped = 0

    total = len(park_gdf)
    print(f"Procesando {total} tramos de aparcamiento...")

    for i, row in park_gdf.iterrows():
        if i % 2000 == 0:
            print(f"  {i}/{total}...")

        geom = row.geometry
        if geom is None or geom.is_empty:
            continue

        # Buscar rutas cercanas
        buf = geom.buffer(BUFFER_M)
        candidate_idxs = list(routes_sindex.intersection(buf.bounds))
        if not candidate_idxs:
            skipped_no_route += 1
            continue

        nearby = routes_gdf.iloc[candidate_idxs]
        nearby = nearby[nearby.intersects(buf)]
        if nearby.empty:
            skipped_no_route += 1
            continue

        route_ids = nearby["route_id"].astype(str).tolist()

        # Determinar lado
        bateria_linea = str(row.get("Bateria_Linea", "")).strip()
        if bateria_linea.upper().startswith("L"):
            # Aparcamiento en linea -> calle estrecha -> ambos lados visibles
            side = "both"
            count_both += 1
        else:
            # Calcular lado geometricamente respecto a la ruta mas cercana
            dists = nearby.distance(geom)
            closest_route = nearby.iloc[int(dists.values.argmin())]
            side = _side_of_route(geom, closest_route.geometry)
            if side == "right":
                count_right += 1
            else:
                count_left_dropped += 1
                continue  # descartar bandas del lado izquierdo

        features_out.append({
            "type": "Feature",
            "geometry": geom.__geo_interface__,
            "properties": {
                "Color":         str(row.get("Color", "")),
                "Bateria_Linea": bateria_linea,
                "Res_NumPlazas": 0 if (v := row.get("Res_NumPlazas")) is None or (isinstance(v, float) and np.isnan(v)) else int(v),
                "side":          side,
                "route_ids":     route_ids,
            },
        })

    print(f"\nResultados:")
    print(f"  Incluidos - right: {count_right}, both: {count_both}")
    print(f"  Descartados - sin ruta cercana: {skipped_no_route}, lado izquierdo: {count_left_dropped}")

    if not features_out:
        print("  AVISO: no se generaron features. Revisa los datos de entrada.")
        return

    # Reproyectar a WGS84 para el frontend
    result_gdf = gpd.GeoDataFrame.from_features(features_out, crs="EPSG:25830")
    result_gdf = result_gdf.to_crs("EPSG:4326")

    out_path = OUT / "parking_bands.geojson"
    result_gdf.to_file(out_path, driver="GeoJSON")
    print(f"\nparking_bands.geojson: {len(result_gdf)} features -> {out_path}")


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== compute_elementos_viales.py ===\n")
    print("--- Carriles bus ---")
    process_bus_lanes()
    print("\n--- Aparcamiento SER ---")
    process_parking_bands()
    print("\nListo.")
