"""
Calcula la divergencia ida/vuelta de cada línea EMT.

Divergencia = % del trayecto total (ida + vuelta) que no transcurre por el
mismo vial. Para cada sentido se usa el shape más frecuente (igual que en
compute_tortuosity.py). La comparación usa buffer híbrido + comprobación
antiparalela para tratar correctamente avenidas anchas divididas (p. ej.
Paseo de la Castellana), donde los carriles de ida y vuelta están separados
30–60 m pero son el mismo vial.

Lógica por punto muestreado:
  1. distancia ≤ BUFFER_TIGHT → compartido (mismo carril).
  2. distancia ≤ BUFFER_WIDE y ángulo antiparalelo (≈180°) → compartido
     (avenida dividida con carriles de sentido contrario).
  3. otro caso → exclusivo (divergente).

- 0 %   → ida y vuelta comparten exactamente el mismo vial.
- 100 % → los dos sentidos tienen recorridos completamente distintos.

Líneas con un solo sentido registrado → divergence = 0.0.

Salida: public/data/route_divergence.json
  {
    "byRoute": { "<route_id>": { "divergence": float } },
    "min": float, "max": float
  }
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import LineString

ROOT = Path(__file__).resolve().parents[1]
GTFS_DIR = ROOT / "data" / "raw" / "GTFS"
OUT_DIR = ROOT / "public" / "data"

BUFFER_TIGHT  = 15   # m — mismo carril (buffer original)
BUFFER_WIDE   = 80   # m — avenidas divididas como Castellana (~60-80 m entre vías de servicio)
ANGLE_AP_TOL  = 35   # º — tolerancia para considerar antiparalelo
SAMPLE_STEP   = 20   # m — resolución de muestreo a lo largo de cada línea
CRS_IN   = "EPSG:4326"
CRS_WORK = "EPSG:25830"  # UTM zona 30N — España peninsular


def load_shape_coords() -> dict[str, list[tuple[float, float]]]:
    """Devuelve { shape_id: [(lon, lat), ...] } en orden de secuencia."""
    df = pd.read_csv(
        GTFS_DIR / "shapes.txt",
        usecols=["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"],
        dtype={"shape_id": str},
    )
    df.sort_values(["shape_id", "shape_pt_sequence"], inplace=True)
    coords: dict[str, list[tuple[float, float]]] = {}
    for shape_id, grp in df.groupby("shape_id", sort=False):
        lons = grp["shape_pt_lon"].to_numpy()
        lats = grp["shape_pt_lat"].to_numpy()
        if len(lons) >= 2:
            coords[shape_id] = list(zip(lons, lats))
    return coords


def best_shapes_per_direction(
    shape_coords: dict,
) -> dict[str, dict[str, str]]:
    """Devuelve { route_id: { direction_id: shape_id } } con el shape más usado."""
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        usecols=["route_id", "direction_id", "shape_id"],
        dtype=str,
    )
    counts: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in trips.itertuples(index=False):
        if row.shape_id and row.shape_id in shape_coords:
            counts[(row.route_id, row.direction_id or "0")][row.shape_id] += 1

    result: dict[str, dict[str, str]] = defaultdict(dict)
    for (route, direction), shapes in counts.items():
        if shapes:
            result[route][direction] = max(shapes.items(), key=lambda kv: kv[1])[0]
    return result


def line_utm(coords: list[tuple[float, float]]) -> object:
    """Convierte una lista de (lon, lat) a LineString proyectada en UTM 30N."""
    gs = gpd.GeoSeries([LineString(coords)], crs=CRS_IN)
    return gs.to_crs(CRS_WORK).iloc[0]


def _local_bearing(line: object, dist: float) -> float:
    """Bearing (grados) de la línea en el punto a `dist` metros del inicio."""
    d1 = max(0.0, dist - 5.0)
    d2 = min(line.length, dist + 5.0)
    p1 = line.interpolate(d1)
    p2 = line.interpolate(d2)
    return math.degrees(math.atan2(p2.x - p1.x, p2.y - p1.y)) % 360


def compute_divergence(line0: object, line1: object) -> float:
    """% del trayecto total (line0 + line1) que no comparte vial.

    Un tramo se considera 'compartido' si:
    - Está dentro de BUFFER_TIGHT metros del otro sentido, O
    - Está dentro de BUFFER_WIDE metros Y los bearings son antiparalelos
      (avenida dividida: carriles opuestos del mismo vial).
    """
    def exclusive_length(src: object, ref: object) -> float:
        n = max(2, int(src.length / SAMPLE_STEP))
        excl = 0.0
        for i in range(n):
            d = src.length * i / (n - 1)
            pt = src.interpolate(d)
            dist_to_ref = pt.distance(ref)
            if dist_to_ref <= BUFFER_TIGHT:
                continue
            if dist_to_ref <= BUFFER_WIDE:
                b_src = _local_bearing(src, d)
                b_ref = _local_bearing(ref, ref.project(pt))
                diff = abs(b_src - b_ref) % 360
                if abs(diff - 180.0) < ANGLE_AP_TOL:
                    continue  # antiparalelo → mismo vial dividido
            excl += SAMPLE_STEP
        return excl

    total = line0.length + line1.length
    if total <= 0:
        return 0.0
    excl = exclusive_length(line0, line1) + exclusive_length(line1, line0)
    return round(excl / total * 100, 1)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Cargando shapes...")
    shape_coords = load_shape_coords()
    print(f"  {len(shape_coords)} shapes")

    print("Determinando shapes representativos por (línea, sentido)...")
    best = best_shapes_per_direction(shape_coords)
    print(f"  {len(best)} líneas")

    by_route: dict[str, dict] = {}
    processed = skipped = 0

    for route, directions in best.items():
        shape0 = directions.get("0")
        shape1 = directions.get("1")

        if shape0 is None and shape1 is None:
            continue

        if shape0 is None or shape1 is None:
            by_route[route] = {"divergence": 0.0}
            skipped += 1
            continue

        try:
            l0 = line_utm(shape_coords[shape0])
            l1 = line_utm(shape_coords[shape1])
            div = compute_divergence(l0, l1)
            by_route[route] = {"divergence": div}
            processed += 1
        except Exception as exc:
            print(f"  [WARN] línea {route}: {exc}")

    values = [v["divergence"] for v in by_route.values()]
    out = {
        "byRoute": by_route,
        "min": round(min(values), 1) if values else 0.0,
        "max": round(max(values), 1) if values else 100.0,
    }

    out_path = OUT_DIR / "route_divergence.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(
        f"OK -> {out_path.relative_to(ROOT)} "
        f"({out_path.stat().st_size / 1e3:.1f} KB, "
        f"{len(by_route)} líneas, {processed} calculadas, {skipped} con 1 sentido, "
        f"min={out['min']} max={out['max']})"
    )


if __name__ == "__main__":
    main()
