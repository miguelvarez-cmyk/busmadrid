"""
Calcula la tortuosidad de cada línea EMT.

Tortuosidad de un sentido = longitud del recorrido (siguiendo el shape) /
distancia en línea recta (haversine) entre el primer y el último vértice del
shape. Valor 1 = trayecto perfectamente recto. Cuanto mayor, más zigzag.

Por línea se reporta la media de las tortuosidades de los dos sentidos (o la
única disponible). Para cada (route, direction) se elige el shape más usado por
los trips, igual que en compute_speed.py.

Salida: public/data/route_tortuosity.json
  {
    "byRoute": {
      "<route_id>": { "tortuosity": float, "lengthKm": float, "straightKm": float }
    },
    "min": float, "max": float
  }
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GTFS_DIR = ROOT / "data" / "raw" / "GTFS_EMT"
OUT_DIR = ROOT / "public" / "data"

R = 6371000.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = p2 - p1
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def shape_geometry() -> dict[str, dict]:
    """Para cada shape: longitud total siguiendo vértices, distancia recta
    entre primer y último vértice, y los propios extremos."""
    df = pd.read_csv(
        GTFS_DIR / "shapes.txt",
        usecols=["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"],
        dtype={"shape_id": str},
    )
    df.sort_values(["shape_id", "shape_pt_sequence"], inplace=True)
    out: dict[str, dict] = {}
    for shape_id, grp in df.groupby("shape_id", sort=False):
        lats = grp["shape_pt_lat"].to_numpy()
        lons = grp["shape_pt_lon"].to_numpy()
        if len(lats) < 2:
            continue
        total = 0.0
        for i in range(1, len(lats)):
            total += haversine_m(lats[i - 1], lons[i - 1], lats[i], lons[i])
        straight = haversine_m(lats[0], lons[0], lats[-1], lons[-1])
        out[shape_id] = {
            "length_m": total,
            "straight_m": straight,
        }
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Calculando geometría de shapes...")
    geo = shape_geometry()
    print(f"  {len(geo)} shapes")

    print("Cargando trips...")
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        usecols=["route_id", "trip_id", "direction_id", "shape_id"],
        dtype=str,
    )

    # shape más usado por (route, direction)
    counts: dict[tuple[str, str], dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in trips.itertuples(index=False):
        if row.shape_id and row.shape_id in geo:
            counts[(row.route_id, row.direction_id or "")][row.shape_id] += 1

    tort_by_route: dict[str, list[float]] = defaultdict(list)
    len_by_route: dict[str, list[float]] = defaultdict(list)
    str_by_route: dict[str, list[float]] = defaultdict(list)

    for (route, _direction), shapes in counts.items():
        if not shapes:
            continue
        shape_id = max(shapes.items(), key=lambda kv: kv[1])[0]
        g = geo[shape_id]
        length_m = g["length_m"]
        straight_m = g["straight_m"]
        if length_m <= 0 or straight_m <= 0:
            continue
        tort = length_m / straight_m
        tort_by_route[route].append(tort)
        len_by_route[route].append(length_m)
        str_by_route[route].append(straight_m)

    byRoute: dict[str, dict] = {}
    for route, ts in tort_by_route.items():
        avg_tort = sum(ts) / len(ts)
        avg_len = sum(len_by_route[route]) / len(len_by_route[route]) / 1000
        avg_str = sum(str_by_route[route]) / len(str_by_route[route]) / 1000
        byRoute[route] = {
            "tortuosity": round(avg_tort, 3),
            "lengthKm": round(avg_len, 2),
            "straightKm": round(avg_str, 2),
        }

    values = [v["tortuosity"] for v in byRoute.values()]
    out = {
        "byRoute": byRoute,
        "min": round(min(values), 3) if values else 1.0,
        "max": round(max(values), 3) if values else 1.0,
    }

    out_path = OUT_DIR / "route_tortuosity.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(
        f"OK -> {out_path.relative_to(ROOT)} "
        f"({out_path.stat().st_size / 1e3:.1f} KB, {len(byRoute)} líneas, "
        f"min={out['min']} max={out['max']})"
    )


if __name__ == "__main__":
    main()
