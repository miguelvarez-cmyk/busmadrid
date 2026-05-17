"""
Genera buildings_line_coverage.geojson:
Para cada edificio residencial de Madrid calcula cuantas lineas de bus
tienen una parada a menos de 350 m del centroide del edificio.

Entrada:
  - Overpass API: poligonos de edificios residenciales en Madrid
  - data/20250101_estructura_demografica/...seccion.shp: poblacion por seccion censal
  - data/raw/GTFS/: stops.txt, routes.txt, trips.txt, stop_times.txt

Salida:
  - public/data/buildings_line_coverage.geojson (compacto, EPSG:4326)

Campos del GeoJSON:
  osm_id, address, poblacion (int), n_lineas (int), lineas (JSON array)
"""

from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import shape
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
ASIGNADOR = ROOT.parent / "asignador_poblacion"

CENSUS_SHP = ASIGNADOR / "data" / "20250101_estructura_demografica" / "20250101_estructura_demografica_seccion.shp"

BUILDINGS_GPKG = ASIGNADOR / "output" / "madrid_edificios_poblacion_sin_residencias_mayores.gpkg"

GTFS_DIR = ROOT / "data" / "raw" / "GTFS"
OUT_FILE = ROOT / "public" / "data" / "buildings_line_coverage.geojson"

CRS_PROJECT = "EPSG:25830"
CRS_WGS84   = "EPSG:4326"
COVERAGE_DISTANCE_M = 350

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_CACHE = ROOT / "data" / "raw" / "_overpass_buildings_cache.json"
OVERPASS_QUERY = """
[out:json][timeout:300];
area["name"="Madrid"]["admin_level"="8"]->.madrid;
(
  way["building"~"^(apartments|residential|house|detached|terrace|semidetached_house|bungalow|dormitory|yes)$"](area.madrid);
  relation["building"~"^(apartments|residential|house|detached|terrace|semidetached_house|bungalow|dormitory)$"](area.madrid);
);
out geom;
"""

RESIDENTIAL_TAGS = {
    "apartments", "residential", "house", "detached",
    "terrace", "semidetached_house", "bungalow", "dormitory", "yes",
}


def _print(msg: str) -> None:
    print(msg.encode("ascii", errors="replace").decode("ascii"), flush=True)


# ---------------------------------------------------------------------------
# Edificios
# ---------------------------------------------------------------------------

def load_buildings_from_gpkg() -> gpd.GeoDataFrame:
    _print(f"Cargando edificios desde GPKG: {BUILDINGS_GPKG}")
    gdf = gpd.read_file(BUILDINGS_GPKG)
    _print(f"  {len(gdf):,} edificios, CRS={gdf.crs}")
    return gdf


def download_buildings_overpass() -> list[dict]:
    # Usar cache si existe para no re-descargar
    if OVERPASS_CACHE.exists():
        _print(f"  Usando cache: {OVERPASS_CACHE.name} ({OVERPASS_CACHE.stat().st_size/1_048_576:.1f} MB)")
        with open(OVERPASS_CACHE, encoding="utf-8") as f:
            return json.load(f)["elements"]

    _print("Descargando edificios residenciales de Madrid via Overpass API...")
    _print("  (puede tardar 2-4 minutos)")
    body = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "BuildingLineCoverage/1.0 (madrid-gtfs-visualizer)",
        },
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=360) as resp:
        raw = resp.read()
    elapsed = time.time() - t0
    _print(f"  Respuesta recibida en {elapsed:.0f}s ({len(raw)/1_048_576:.1f} MB)")

    # Guardar cache
    OVERPASS_CACHE.parent.mkdir(parents=True, exist_ok=True)
    with open(OVERPASS_CACHE, "wb") as f:
        f.write(raw)
    _print(f"  Cache guardado en {OVERPASS_CACHE.name}")

    return json.loads(raw)["elements"]


def overpass_elements_to_gdf(elements: list[dict]) -> gpd.GeoDataFrame:
    from shapely.geometry import Polygon, MultiPolygon
    from shapely.ops import unary_union

    _print(f"Construyendo geometrias para {len(elements):,} elementos...")

    # Separar ways y relations
    node_coords: dict[int, tuple[float, float]] = {}
    ways: dict[int, list] = {}
    features = []

    for el in elements:
        if el["type"] == "node":
            node_coords[el["id"]] = (el["lon"], el["lat"])
        elif el["type"] == "way" and "geometry" in el:
            coords = [(n["lon"], n["lat"]) for n in el["geometry"]]
            if len(coords) >= 4:
                try:
                    geom = Polygon(coords)
                    if not geom.is_valid:
                        geom = geom.buffer(0)
                    if not geom.is_empty and geom.area > 0:
                        tags = el.get("tags", {})
                        features.append({
                            "osm_id": f"way/{el['id']}",
                            "building": tags.get("building", "yes"),
                            "name": tags.get("name") or tags.get("addr:housename", ""),
                            "addr_street": tags.get("addr:street", ""),
                            "addr_number": tags.get("addr:housenumber", ""),
                            "geometry": geom,
                        })
                except Exception:
                    pass
        elif el["type"] == "relation" and "members" in el:
            outer_rings = []
            for m in el.get("members", []):
                if m.get("role") == "outer" and "geometry" in m:
                    coords = [(n["lon"], n["lat"]) for n in m["geometry"]]
                    if len(coords) >= 4:
                        try:
                            ring = Polygon(coords)
                            if not ring.is_valid:
                                ring = ring.buffer(0)
                            if not ring.is_empty:
                                outer_rings.append(ring)
                        except Exception:
                            pass
            if outer_rings:
                try:
                    geom = unary_union(outer_rings)
                    if not geom.is_valid:
                        geom = geom.buffer(0)
                    if not geom.is_empty:
                        tags = el.get("tags", {})
                        features.append({
                            "osm_id": f"relation/{el['id']}",
                            "building": tags.get("building", "yes"),
                            "name": tags.get("name") or tags.get("addr:housename", ""),
                            "addr_street": tags.get("addr:street", ""),
                            "addr_number": tags.get("addr:housenumber", ""),
                            "geometry": geom,
                        })
                except Exception:
                    pass

    _print(f"  {len(features):,} edificios con geometria valida")
    gdf = gpd.GeoDataFrame(features, crs=CRS_WGS84)
    return gdf


def assign_population(buildings: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    _print("Asignando poblacion por seccion censal...")
    if not CENSUS_SHP.exists():
        _print(f"  AVISO: Secciones censales no encontradas en {CENSUS_SHP}")
        _print("  Asignando poblacion=0 a todos los edificios")
        buildings["poblacion"] = 0.0
        buildings["cod_sec"] = ""
        return buildings

    census = gpd.read_file(CENSUS_SHP)
    _print(f"  {len(census):,} secciones censales, CRS={census.crs}")

    # Reproyectar todo a CRS_PROJECT para calculos en metros
    if buildings.crs != CRS_PROJECT:
        buildings = buildings.to_crs(CRS_PROJECT)
    if census.crs != CRS_PROJECT:
        census = census.to_crs(CRS_PROJECT)

    # Area de planta de cada edificio (m2)
    buildings["area_m2"] = buildings.geometry.area

    # Centroide para el sjoin (mas robusto que interseccion poligono-poligono)
    buildings_centroids = buildings.copy()
    buildings_centroids["geometry"] = buildings.geometry.centroid

    # Join espacial: asignar cada edificio a su seccion censal
    joined = gpd.sjoin(
        buildings_centroids[["osm_id", "area_m2", "geometry"]],
        census[["COD_SEC", "Densidad", "geometry"]],
        how="left",
        predicate="within",
    )
    # Eliminar duplicados si un centroide cae en varias secciones (raro)
    joined = joined.drop_duplicates(subset="osm_id")

    # Calcular poblacion de la seccion: densidad (hab/ha) * area_seccion (ha)
    census["area_ha"] = census.geometry.area / 10_000
    census["pop_seccion"] = census["Densidad"] * census["area_ha"]

    # Sumar area_m2 de edificios por seccion
    area_by_section = (
        joined.groupby("COD_SEC")["area_m2"].sum().rename("total_area_seccion")
    )
    census = census.set_index("COD_SEC").join(area_by_section, how="left")
    census["total_area_seccion"] = census["total_area_seccion"].fillna(1.0).clip(lower=1.0)

    # Merge de vuelta a buildings
    buildings = buildings.merge(
        joined[["osm_id", "COD_SEC"]].rename(columns={"COD_SEC": "cod_sec"}),
        on="osm_id",
        how="left",
    )
    buildings["cod_sec"] = buildings["cod_sec"].fillna("")

    # Merge de parametros de seccion
    census_params = census[["pop_seccion", "total_area_seccion"]].reset_index()
    census_params.columns = ["cod_sec", "pop_seccion", "total_area_seccion"]
    buildings = buildings.merge(census_params, on="cod_sec", how="left")
    buildings["pop_seccion"] = buildings["pop_seccion"].fillna(0.0)
    buildings["total_area_seccion"] = buildings["total_area_seccion"].fillna(1.0)

    # Poblacion proporcional al area de planta dentro de la seccion
    buildings["poblacion"] = (
        buildings["pop_seccion"] * buildings["area_m2"] / buildings["total_area_seccion"]
    )
    buildings["poblacion"] = buildings["poblacion"].fillna(0.0).clip(lower=0.0)

    _print(f"  Poblacion total asignada: {buildings['poblacion'].sum():,.0f} hab")
    return buildings


# ---------------------------------------------------------------------------
# GTFS: stops → lineas
# ---------------------------------------------------------------------------

def build_stop_lines_map() -> tuple[gpd.GeoDataFrame, dict[str, set[str]]]:
    _print("Cargando GTFS...")

    stops = pd.read_csv(GTFS_DIR / "stops.txt", dtype=str)
    routes = pd.read_csv(GTFS_DIR / "routes.txt", dtype=str)
    trips = pd.read_csv(GTFS_DIR / "trips.txt", dtype=str)
    stop_times = pd.read_csv(GTFS_DIR / "stop_times.txt", dtype=str, usecols=["trip_id", "stop_id"])

    _print(f"  {len(stops):,} paradas, {len(routes):,} lineas, {len(trips):,} trips")

    # trip_id → route_short_name
    trip_route = trips.merge(
        routes[["route_id", "route_short_name"]], on="route_id", how="left"
    )[["trip_id", "route_short_name"]].drop_duplicates()

    # stop_id → set(route_short_name)
    stop_trip = stop_times.merge(trip_route, on="trip_id", how="left")
    stop_lines = (
        stop_trip.groupby("stop_id")["route_short_name"]
        .apply(set)
        .to_dict()
    )

    # GeoDataFrame de paradas en CRS_PROJECT
    stops["stop_lat"] = stops["stop_lat"].astype(float)
    stops["stop_lon"] = stops["stop_lon"].astype(float)
    stops_gdf = gpd.GeoDataFrame(
        stops,
        geometry=gpd.points_from_xy(stops["stop_lon"], stops["stop_lat"]),
        crs=CRS_WGS84,
    ).to_crs(CRS_PROJECT)

    _print(f"  stop_lines map: {len(stop_lines):,} paradas con lineas asignadas")
    return stops_gdf, stop_lines


# ---------------------------------------------------------------------------
# Cobertura: edificio → lineas a <= COVERAGE_DISTANCE_M
# ---------------------------------------------------------------------------

def compute_coverage(
    buildings: gpd.GeoDataFrame,
    stops_gdf: gpd.GeoDataFrame,
    stop_lines: dict[str, set[str]],
) -> gpd.GeoDataFrame:
    _print(f"Calculando lineas por edificio a {COVERAGE_DISTANCE_M} m (STRtree)...")

    # Asegurar mismo CRS
    if buildings.crs != CRS_PROJECT:
        buildings = buildings.to_crs(CRS_PROJECT)
    if stops_gdf.crs != CRS_PROJECT:
        stops_gdf = stops_gdf.to_crs(CRS_PROJECT)

    # Centroides de edificios
    centroids = buildings.geometry.centroid

    # STRtree sobre paradas
    stop_geoms = list(stops_gdf.geometry)
    stop_ids_list = list(stops_gdf["stop_id"])
    tree = STRtree(stop_geoms)

    n_lineas_list = []
    lineas_list = []

    t0 = time.time()
    for i, centroid in enumerate(centroids):
        # Indices de paradas dentro de COVERAGE_DISTANCE_M
        candidate_idxs = tree.query(centroid.buffer(COVERAGE_DISTANCE_M))
        lines_set: set[str] = set()
        for idx in candidate_idxs:
            sid = stop_ids_list[idx]
            if sid in stop_lines:
                lines_set.update(stop_lines[sid])
        n_lineas_list.append(len(lines_set))
        lineas_list.append(sorted(lines_set))

        if (i + 1) % 10_000 == 0:
            elapsed = time.time() - t0
            pct = (i + 1) / len(centroids) * 100
            _print(f"  {i+1:,}/{len(centroids):,} ({pct:.0f}%) — {elapsed:.0f}s")

    buildings = buildings.copy()
    buildings["n_lineas"] = n_lineas_list
    buildings["lineas"] = [json.dumps(l) for l in lineas_list]
    _print(f"  Cobertura calculada en {time.time()-t0:.0f}s")
    _print(f"  Edificios con >= 1 linea: {sum(1 for n in n_lineas_list if n > 0):,}")
    return buildings


# ---------------------------------------------------------------------------
# Exportacion
# ---------------------------------------------------------------------------

def round_coords(geom: dict, precision: int = 5) -> dict:
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


def build_address(row: pd.Series) -> str:
    if row.get("addr_street") and row.get("addr_number"):
        return f"{row['addr_street']} {row['addr_number']}"
    if row.get("addr_street"):
        return row["addr_street"]
    if row.get("name"):
        return row["name"]
    cod = row.get("cod_sec", "")
    return f"Edificio en {cod}" if cod else row.get("osm_id", "")


def export_geojson(buildings: gpd.GeoDataFrame) -> None:
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    _print("Exportando GeoJSON...")

    # Reproyectar a WGS84
    if buildings.crs != CRS_WGS84:
        buildings = buildings.to_crs(CRS_WGS84)

    # Simplificar geometrias (0.00003 grados ~ 3 m) para reducir tamano
    buildings["geometry"] = buildings.geometry.simplify(0.00003, preserve_topology=True)
    buildings = buildings[~buildings.geometry.is_empty]

    # Filtrar solo edificios con poblacion > 0
    buildings = buildings[buildings["poblacion"] > 0].copy()
    _print(f"  Edificios con poblacion > 0: {len(buildings):,}")

    features = []
    for _, row in buildings.iterrows():
        address = build_address(row)
        features.append({
            "type": "Feature",
            "geometry": round_coords(row.geometry.__geo_interface__, precision=5),
            "properties": {
                "osm_id":    row["osm_id"],
                "address":   address,
                "poblacion": int(round(row["poblacion"])),
                "n_lineas":  int(row["n_lineas"]),
                "lineas":    row["lineas"],
            },
        })

    geojson = {"type": "FeatureCollection", "features": features}
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(geojson, f, separators=(",", ":"), ensure_ascii=False)

    size_mb = OUT_FILE.stat().st_size / 1_048_576
    _print(f"  Exportado: {OUT_FILE} ({size_mb:.1f} MB, {len(features):,} edificios)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    t_total = time.time()
    _print("=" * 60)
    _print("compute_building_line_coverage.py")
    _print("=" * 60)

    # Validar GTFS
    for fname in ["stops.txt", "routes.txt", "trips.txt", "stop_times.txt"]:
        p = GTFS_DIR / fname
        if not p.exists():
            _print(f"ERROR: falta {p}")
            _print("Ejecuta primero: python scripts/process_gtfs.py")
            sys.exit(1)

    # 1. Cargar o descargar edificios
    if BUILDINGS_GPKG.exists():
        buildings = load_buildings_from_gpkg()
        # Campos esperados del GPKG (sin addr_street/addr_number/name)
        for col in ["addr_street", "addr_number", "name"]:
            if col not in buildings.columns:
                buildings[col] = ""
    else:
        _print(f"GPKG no encontrado en {BUILDINGS_GPKG}")
        _print("Descargando edificios desde Overpass API...")
        elements = download_buildings_overpass()
        buildings = overpass_elements_to_gdf(elements)

        # Asignar poblacion desde secciones censales
        buildings = assign_population(buildings)

    # Filtrar poblacion > 0 antes del procesamiento pesado
    if "poblacion" not in buildings.columns:
        buildings = assign_population(buildings)

    buildings = buildings[buildings["poblacion"] > 0].copy()
    _print(f"Edificios con poblacion > 0: {len(buildings):,}")

    # Simplificar geometrias para reducir memoria
    if buildings.crs != CRS_PROJECT:
        buildings = buildings.to_crs(CRS_PROJECT)
    buildings["geometry"] = buildings.geometry.simplify(1.0, preserve_topology=True)

    # 2. GTFS
    stops_gdf, stop_lines = build_stop_lines_map()

    # 3. Cobertura
    buildings = compute_coverage(buildings, stops_gdf, stop_lines)

    # 4. Exportar
    export_geojson(buildings)

    _print(f"\nListo en {time.time()-t_total:.0f}s")


if __name__ == "__main__":
    main()
