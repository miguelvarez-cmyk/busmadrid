"""
Calcula qué líneas EMT pasan por cada distrito y barrio de Madrid.

Una línea "pasa por" un distrito/barrio si algún tramo de su geometría
intersecta el polígono de ese distrito/barrio.

Entradas:
  - public/data/routes.geojson               (generado por process_gtfs.py)
  - data/raw/distritos_barrios/BARRIOS.shp   (shapefile con barrios y distritos)

El shapefile BARRIOS.shp contiene 131 filas (una por barrio) con campos:
  CODDIS  — código de distrito (entero 1..21)
  NOMDIS  — nombre del distrito
  COD_BAR — código de barrio (string "011", "012" …)
  NOMBRE  — nombre del barrio

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
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[1]
ROUTES_FILE = ROOT / "public" / "data" / "routes.geojson"
BOUNDARIES_FILE = ROOT / "data" / "raw" / "distritos_barrios" / "BARRIOS.shp"
OUT_FILE = ROOT / "public" / "data" / "route_districts.json"

DIST_ID_FIELD = "CODDIS"    # entero 1..21
DIST_NAME_FIELD = "NOMDIS"
BAR_ID_FIELD = "COD_BAR"    # string "011", "012" …
BAR_NAME_FIELD = "NOMBRE"


def _dist_id(val) -> str:
    """Normaliza código de distrito a string de 2 dígitos: 1 → '01'."""
    return str(int(val)).zfill(2)


def main() -> None:
    if not ROUTES_FILE.exists():
        raise FileNotFoundError(
            f"No se encuentra {ROUTES_FILE.relative_to(ROOT)}.\n"
            "Ejecuta primero: python scripts/process_gtfs.py"
        )
    if not BOUNDARIES_FILE.exists():
        raise FileNotFoundError(
            f"No se encuentra {BOUNDARIES_FILE.relative_to(ROOT)}.\n"
            "Coloca el shapefile BARRIOS.shp en data/raw/distritos_barrios/."
        )

    print("Cargando routes.geojson…")
    routes = gpd.read_file(ROUTES_FILE).to_crs("EPSG:4326")
    print(f"  {len(routes)} líneas")

    print("Cargando límites administrativos…")
    barrios_gdf = gpd.read_file(BOUNDARIES_FILE).to_crs("EPSG:4326")
    print(f"  {len(barrios_gdf)} barrios")

    # Validar campos
    for field in [DIST_ID_FIELD, DIST_NAME_FIELD, BAR_ID_FIELD, BAR_NAME_FIELD]:
        if field not in barrios_gdf.columns:
            raise KeyError(
                f"Campo '{field}' no encontrado en el shapefile. "
                f"Columnas disponibles: {list(barrios_gdf.columns)}"
            )

    # ── Spatial join: rutas × barrios ─────────────────────────────────────
    print("Calculando intersecciones rutas × barrios (puede tardar 1-2 min)…")
    joined = gpd.sjoin(
        routes[["route_id", "geometry"]],
        barrios_gdf[[BAR_ID_FIELD, DIST_ID_FIELD, "geometry"]],
        how="inner",
        predicate="intersects",
    )

    # barrio → set de route_ids
    bar_routes: dict[str, set[str]] = {}
    for _, row in joined.iterrows():
        bid = str(row[BAR_ID_FIELD])
        bar_routes.setdefault(bid, set()).add(str(row["route_id"]))

    # ── Construir estructura distritos → barrios → routeIds ───────────────
    # Derivar metadatos de distritos directamente del shapefile de barrios
    dist_meta: dict[str, str] = {}
    for _, row in barrios_gdf.drop_duplicates(subset=[DIST_ID_FIELD]).iterrows():
        did = _dist_id(row[DIST_ID_FIELD])
        dist_meta[did] = str(row[DIST_NAME_FIELD]).title()

    # Barrios agrupados por distrito
    dist_barrios: dict[str, list] = {did: [] for did in dist_meta}
    for _, row in barrios_gdf.sort_values(BAR_ID_FIELD).iterrows():
        bid = str(row[BAR_ID_FIELD])
        did = _dist_id(row[DIST_ID_FIELD])
        route_ids = sorted(bar_routes.get(bid, set()))
        dist_barrios.setdefault(did, []).append({
            "id": bid,
            "nombre": str(row[BAR_NAME_FIELD]).title(),
            "routeIds": route_ids,
        })

    # Ensamblar salida
    distritos_out = []
    for did in sorted(dist_meta.keys()):
        barrios_list = dist_barrios.get(did, [])
        all_routes = sorted({rid for b in barrios_list for rid in b["routeIds"]})
        distritos_out.append({
            "id": did,
            "nombre": dist_meta[did],
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
