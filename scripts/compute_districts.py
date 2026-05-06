"""
Calcula qué líneas EMT pasan por cada distrito y barrio de Madrid.

Una línea "pasa por" un distrito/barrio si algún tramo de su geometría
intersecta el polígono de ese distrito/barrio.

Entradas:
  - public/data/routes.geojson               (generado por process_gtfs.py)
  - data/raw/boundaries/distritos.geojson    (ver instrucciones abajo)
  - data/raw/boundaries/barrios.geojson      (ver instrucciones abajo)

Cómo obtener los límites administrativos:
  1. Ve a https://datos.madrid.es/
  2. Busca "barrios" → descarga el archivo GeoJSON/JSON y guárdalo en
     data/raw/boundaries/barrios.geojson
  3. Busca "distritos" → descarga y guárdalo en
     data/raw/boundaries/distritos.geojson

  Si el portal no ofrece GeoJSON directamente, el script también intenta
  descargarlos automáticamente desde los servicios ArcGIS del Ayuntamiento.

Salida: public/data/route_districts.json
  {
    "distritos": [
      {
        "id": "01",
        "nombre": "Centro",
        "routeIds": ["1", "2", ...],
        "barrios": [
          { "id": "011", "nombre": "Palacio", "routeIds": ["1", "2"] },
          ...
        ]
      },
      ...
    ]
  }
"""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
ROUTES_FILE = ROOT / "public" / "data" / "routes.geojson"
BOUNDARIES_DIR = ROOT / "data" / "raw" / "boundaries"
OUT_FILE = ROOT / "public" / "data" / "route_districts.json"

# URLs del servicio ArcGIS del Ayuntamiento de Madrid (fallback automático)
_ARCGIS_BASE = (
    "https://services6.arcgis.com/RvpHpFjkNQLFu90e/arcgis/rest/services"
)
DISTRITOS_URL = (
    f"{_ARCGIS_BASE}/DISTRITOS_MADRID_WGS84/FeatureServer/0/query"
    "?where=1%3D1&outFields=*&f=geojson&outSR=4326"
)
BARRIOS_URL = (
    f"{_ARCGIS_BASE}/BARRIOS_MADRID_WGS84/FeatureServer/0/query"
    "?where=1%3D1&outFields=*&f=geojson&outSR=4326"
)

# Nombres de campo esperados en los GeoJSON del Ayuntamiento de Madrid.
# Si usas un GeoJSON de otra fuente puede que los campos tengan otros nombres;
# ajusta aquí si el script falla con KeyError.
DIST_ID_FIELD = "COD_DIS"      # "01", "02" … "21"
DIST_NAME_FIELD = "NOMBRE"
BAR_ID_FIELD = "COD_BAR"       # "011", "012" …
BAR_NAME_FIELD = "NOMBRE"
BAR_DIS_FIELD = "COD_DIS"      # FK al distrito


def _download(url: str, dest: Path) -> None:
    """Descarga url y guarda en dest."""
    print(f"  Descargando {dest.name} …")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        # Verificar que es GeoJSON válido
        parsed = json.loads(data)
        if parsed.get("type") not in ("FeatureCollection", "Feature"):
            raise ValueError(f"La respuesta no es GeoJSON: {str(data[:200])}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        print(f"  -> {dest} ({len(data) / 1e3:.1f} KB)")
    except Exception as exc:
        raise RuntimeError(
            f"No se pudo descargar {dest.name}.\n"
            f"URL intentada: {url}\n"
            f"Error: {exc}\n\n"
            "Descarga manualmente los límites administrativos de Madrid desde:\n"
            "  https://datos.madrid.es/\n"
            "Busca 'barrios' y 'distritos', descarga en formato GeoJSON y\n"
            f"guárdalos en:\n"
            f"  {BOUNDARIES_DIR / 'distritos.geojson'}\n"
            f"  {BOUNDARIES_DIR / 'barrios.geojson'}"
        ) from exc


def load_boundaries() -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """Carga (o descarga) los GeoJSON de distritos y barrios."""
    dist_path = BOUNDARIES_DIR / "distritos.geojson"
    bar_path = BOUNDARIES_DIR / "barrios.geojson"

    if not dist_path.exists():
        print("Límites de distritos no encontrados, intentando descarga…")
        _download(DISTRITOS_URL, dist_path)
    if not bar_path.exists():
        print("Límites de barrios no encontrados, intentando descarga…")
        _download(BARRIOS_URL, bar_path)

    distritos = gpd.read_file(dist_path)
    barrios = gpd.read_file(bar_path)
    return distritos, barrios


def _normalise_id(val) -> str:
    """Convierte el campo ID a string con cero a la izquierda si es numérico."""
    s = str(val).strip()
    if s.isdigit():
        # Longitud típica: 2 para distrito, 3 para barrio
        return s.zfill(2) if int(s) <= 21 else s.zfill(3)
    return s


def main() -> None:
    if not ROUTES_FILE.exists():
        raise FileNotFoundError(
            f"No se encuentra {ROUTES_FILE.relative_to(ROOT)}.\n"
            "Ejecuta primero: python scripts/process_gtfs.py"
        )

    print("Cargando routes.geojson…")
    routes = gpd.read_file(ROUTES_FILE)
    routes = routes.to_crs("EPSG:4326")
    print(f"  {len(routes)} líneas")

    print("Cargando límites administrativos…")
    distritos_gdf, barrios_gdf = load_boundaries()
    distritos_gdf = distritos_gdf.to_crs("EPSG:4326")
    barrios_gdf = barrios_gdf.to_crs("EPSG:4326")
    print(f"  {len(distritos_gdf)} distritos, {len(barrios_gdf)} barrios")

    # Validar campos esperados
    for field, gdf, label in [
        (DIST_ID_FIELD, distritos_gdf, "distritos"),
        (DIST_NAME_FIELD, distritos_gdf, "distritos"),
        (BAR_ID_FIELD, barrios_gdf, "barrios"),
        (BAR_NAME_FIELD, barrios_gdf, "barrios"),
        (BAR_DIS_FIELD, barrios_gdf, "barrios"),
    ]:
        if field not in gdf.columns:
            avail = list(gdf.columns)
            raise KeyError(
                f"Campo '{field}' no encontrado en {label}. "
                f"Columnas disponibles: {avail}. "
                "Ajusta las constantes DIST_ID_FIELD / BAR_ID_FIELD etc. "
                "al inicio de este script."
            )

    # ── Spatial join: rutas × barrios ──────────────────────────────────────
    print("Calculando intersecciones rutas × barrios (puede tardar 1-2 min)…")
    # predicate='intersects': una ruta pertenece al barrio si cualquier segmento
    # de su MultiLineString toca el polígono del barrio
    joined = gpd.sjoin(
        routes[["route_id", "geometry"]],
        barrios_gdf[[BAR_ID_FIELD, BAR_NAME_FIELD, BAR_DIS_FIELD, "geometry"]],
        how="inner",
        predicate="intersects",
    )

    # ── Agrupar: barrio → lista de route_ids ───────────────────────────────
    bar_routes: dict[str, set[str]] = {}
    for _, row in joined.iterrows():
        bid = _normalise_id(row[BAR_ID_FIELD])
        bar_routes.setdefault(bid, set()).add(str(row["route_id"]))

    # ── Construir estructura distritos → barrios → routeIds ────────────────
    # Primero agrupamos los barrios por distrito
    bar_meta: dict[str, dict] = {}
    for _, row in barrios_gdf.iterrows():
        bid = _normalise_id(row[BAR_ID_FIELD])
        did = _normalise_id(row[BAR_DIS_FIELD])
        bar_meta[bid] = {
            "id": bid,
            "nombre": str(row[BAR_NAME_FIELD]).title(),
            "distId": did,
        }

    dist_meta: dict[str, dict] = {}
    for _, row in distritos_gdf.iterrows():
        did = _normalise_id(row[DIST_ID_FIELD])
        dist_meta[did] = {
            "id": did,
            "nombre": str(row[DIST_NAME_FIELD]).title(),
        }

    # Construir lista de barrios por distrito
    dist_barrios: dict[str, list] = {did: [] for did in dist_meta}
    for bid, bmeta in sorted(bar_meta.items()):
        did = bmeta["distId"]
        if did not in dist_barrios:
            dist_barrios[did] = []
        route_ids = sorted(bar_routes.get(bid, set()))
        dist_barrios[did].append({
            "id": bid,
            "nombre": bmeta["nombre"],
            "routeIds": route_ids,
        })

    # Agregar routeIds de distrito = unión de todos sus barrios
    distritos_out = []
    for did in sorted(dist_meta.keys()):
        barrios_list = dist_barrios.get(did, [])
        all_routes = sorted({rid for b in barrios_list for rid in b["routeIds"]})
        distritos_out.append({
            "id": did,
            "nombre": dist_meta[did]["nombre"],
            "routeIds": all_routes,
            "barrios": barrios_list,
        })

    total_pairs = sum(len(d["routeIds"]) for d in distritos_out)
    print(f"  {len(distritos_out)} distritos, {total_pairs} pares línea-distrito")

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUT_FILE.open("w", encoding="utf-8") as f:
        json.dump({"distritos": distritos_out}, f, ensure_ascii=False, separators=(",", ":"))

    print(f"OK -> {OUT_FILE.relative_to(ROOT)} ({OUT_FILE.stat().st_size / 1e3:.1f} KB)")


if __name__ == "__main__":
    main()
