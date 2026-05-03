"""
Calcula la velocidad comercial media por línea EMT.

Modelo:
  - Para cada trip se calcula la duración como (último departure_time - primer
    departure_time) en stop_times.txt.
  - Para cada (route, direction) se agrupan los trips y se toma la mediana de
    duración (más robusta que la media frente a trips reforzados o cortados),
    y la longitud del shape más usado por esa combinación.
  - Velocidad del sentido = longitud_km / duración_h
  - Velocidad de la línea = media de las velocidades de sus dos sentidos
    (si solo hay un sentido, esa misma).

Salida: public/data/route_speed.json
  {
    "byRoute": {
      "<route_id>": { "speedKmh": float, "lengthKm": float, "durMin": float }
    },
    "min": float,
    "max": float
  }
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GTFS_DIR = ROOT / "data" / "raw" / "GTFS"
OUT_DIR = ROOT / "public" / "data"


def parse_gtfs_time(s: str) -> int:
    h, m, sec = s.split(":")
    return int(h) * 3600 + int(m) * 60 + int(sec)


def shape_lengths_m() -> dict[str, float]:
    """Longitud (m) de cada shape, sumando haversine entre vértices consecutivos."""
    df = pd.read_csv(
        GTFS_DIR / "shapes.txt",
        usecols=["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"],
        dtype={"shape_id": str},
    )
    df.sort_values(["shape_id", "shape_pt_sequence"], inplace=True)
    R = 6371000.0
    out: dict[str, float] = {}
    for shape_id, grp in df.groupby("shape_id", sort=False):
        lats = grp["shape_pt_lat"].to_numpy()
        lons = grp["shape_pt_lon"].to_numpy()
        total = 0.0
        for i in range(1, len(lats)):
            lat1, lat2 = math.radians(lats[i - 1]), math.radians(lats[i])
            dlat = lat2 - lat1
            dlon = math.radians(lons[i] - lons[i - 1])
            a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            total += 2 * R * math.asin(math.sqrt(a))
        out[shape_id] = total
    return out


def trip_durations_s() -> dict[str, int]:
    """Duración (s) de cada trip: último - primer departure_time."""
    first: dict[str, tuple[int, int]] = {}  # trip_id -> (min_seq, sec)
    last: dict[str, tuple[int, int]] = {}
    for chunk in pd.read_csv(
        GTFS_DIR / "stop_times.txt",
        usecols=["trip_id", "departure_time", "stop_sequence"],
        dtype={"trip_id": str, "departure_time": str, "stop_sequence": int},
        chunksize=500_000,
    ):
        for tid, dep, seq in zip(chunk["trip_id"], chunk["departure_time"], chunk["stop_sequence"]):
            sec = parse_gtfs_time(dep)
            f = first.get(tid)
            if f is None or seq < f[0]:
                first[tid] = (seq, sec)
            l = last.get(tid)
            if l is None or seq > l[0]:
                last[tid] = (seq, sec)
    return {tid: last[tid][1] - first[tid][1] for tid in first if tid in last}


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Calculando longitud de shapes...")
    s_len = shape_lengths_m()
    print(f"  {len(s_len)} shapes")

    print("Cargando trips...")
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        usecols=["route_id", "trip_id", "direction_id", "shape_id"],
        dtype=str,
    )

    print("Calculando duración de trips desde stop_times...")
    durations = trip_durations_s()
    print(f"  {len(durations)} trips con duración")

    # Agrupar por (route, direction): lista de duraciones y conteo de shape_ids
    by_dir: dict[tuple[str, str], dict] = defaultdict(
        lambda: {"durations": [], "shape_count": defaultdict(int)}
    )
    for row in trips.itertuples(index=False):
        d = durations.get(row.trip_id)
        if d is None or d <= 0:
            continue
        key = (row.route_id, row.direction_id or "")
        by_dir[key]["durations"].append(d)
        if row.shape_id and row.shape_id in s_len:
            by_dir[key]["shape_count"][row.shape_id] += 1

    # Velocidad por (route, direction)
    speed_by_dir: dict[str, list[float]] = defaultdict(list)
    length_by_dir: dict[str, list[float]] = defaultdict(list)
    dur_by_dir: dict[str, list[float]] = defaultdict(list)
    for (route, _direction), info in by_dir.items():
        if not info["durations"] or not info["shape_count"]:
            continue
        durs = sorted(info["durations"])
        median_s = durs[len(durs) // 2]
        if median_s <= 0:
            continue
        # shape más usado en este sentido
        shape_id = max(info["shape_count"].items(), key=lambda kv: kv[1])[0]
        length_m = s_len[shape_id]
        if length_m <= 0:
            continue
        speed_kmh = length_m / median_s * 3.6
        speed_by_dir[route].append(speed_kmh)
        length_by_dir[route].append(length_m)
        dur_by_dir[route].append(median_s)

    byRoute: dict[str, dict] = {}
    for route, speeds in speed_by_dir.items():
        avg_speed = sum(speeds) / len(speeds)
        avg_len_km = sum(length_by_dir[route]) / len(length_by_dir[route]) / 1000
        avg_dur_min = sum(dur_by_dir[route]) / len(dur_by_dir[route]) / 60
        byRoute[route] = {
            "speedKmh": round(avg_speed, 2),
            "lengthKm": round(avg_len_km, 2),
            "durMin": round(avg_dur_min, 1),
        }

    speeds = [v["speedKmh"] for v in byRoute.values()]
    out = {
        "byRoute": byRoute,
        "min": round(min(speeds), 2) if speeds else 0,
        "max": round(max(speeds), 2) if speeds else 0,
    }

    out_path = OUT_DIR / "route_speed.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(
        f"OK -> {out_path.relative_to(ROOT)} "
        f"({out_path.stat().st_size / 1e3:.1f} KB, {len(byRoute)} líneas, "
        f"min={out['min']} max={out['max']} km/h)"
    )


if __name__ == "__main__":
    main()
