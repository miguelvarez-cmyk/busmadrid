"""
Calcula la oferta (expediciones por hora) por línea y día de la semana a partir
de routes.txt, trips.txt, stop_times.txt y calendar.txt del feed de la EMT.

Modelo (verificado contra el feed EMT real):
  - Cada trip_id en trips.txt representa UNA expedición individual (un viaje
    de un bus). El campo block_id identifica el bus físico que la realiza.
  - frequencies.txt no es fiable como fuente de conteo: para algunas líneas la
    ventana cubre 1 hora con headway "informativo", pero para otras (p.ej. S10)
    la ventana cubre todo el día con un único start_time, lo que infla el conteo
    si se interpreta como patrón GTFS estándar.
  - La hora de salida real de cada trip está siempre en stop_times.txt, en el
    departure_time del stop con stop_sequence == 1.
  - Cada service_id (LA, LJ, SA, FE, VV) se mapea a sus días de la semana
    (calendar.txt). Los trips se replican en cada día activo.

Salida: public/data/service_metrics.json
  {
    "byRoute": { "<route_id>": { "0": [24], ..., "6": [24] } },  # exp/hora por dow
    "globalMax": int,
    "dayNames": ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]
  }
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GTFS_DIR = ROOT / "data" / "raw" / "GTFS"
OUT_DIR = ROOT / "public" / "data"

DAY_COLS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def parse_gtfs_time(s: str) -> int:
    """Devuelve segundos desde medianoche; admite horas >= 24 (servicio nocturno)."""
    h, m, sec = s.split(":")
    return int(h) * 3600 + int(m) * 60 + int(sec)


def service_to_dows() -> dict[str, list[int]]:
    cal = pd.read_csv(GTFS_DIR / "calendar.txt", dtype={"service_id": str})
    return {
        row["service_id"]: [i for i, c in enumerate(DAY_COLS) if int(row[c]) == 1]
        for _, row in cal.iterrows()
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Cargando trips...")
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        usecols=["route_id", "service_id", "trip_id"],
        dtype=str,
    )
    print(f"  {len(trips)} trips")
    trip_to_route = dict(zip(trips["trip_id"], trips["route_id"]))
    trip_to_service = dict(zip(trips["trip_id"], trips["service_id"]))

    svc_dows = service_to_dows()
    print(f"  services: {svc_dows}")

    print("Extrayendo hora de salida (stop_sequence==1) desde stop_times...")
    first_dep: dict[str, str] = {}
    rows_seen = 0
    for chunk in pd.read_csv(
        GTFS_DIR / "stop_times.txt",
        usecols=["trip_id", "departure_time", "stop_sequence"],
        dtype={"trip_id": str, "departure_time": str},
        chunksize=500_000,
    ):
        rows_seen += len(chunk)
        first = chunk[chunk["stop_sequence"] == 1]
        for tid, dep in zip(first["trip_id"], first["departure_time"]):
            first_dep[tid] = dep
    print(f"  {rows_seen} filas leídas, {len(first_dep)} trips con hora de salida")

    missing = [t for t in trip_to_route if t not in first_dep]
    if missing:
        print(f"  aviso: {len(missing)} trips sin stop_sequence==1 (se ignoran)")

    # byRoute[route_id][dow][hour] = nº expediciones
    byRoute: dict[str, list[list[int]]] = defaultdict(
        lambda: [[0] * 24 for _ in range(7)]
    )

    print("Acumulando expediciones por línea/día/hora...")
    for trip_id, dep in first_dep.items():
        route_id = trip_to_route.get(trip_id)
        service_id = trip_to_service.get(trip_id)
        if not route_id or not service_id:
            continue
        dows = svc_dows.get(service_id, [])
        if not dows:
            continue
        h = (parse_gtfs_time(dep) // 3600) % 24
        for dow in dows:
            byRoute[route_id][dow][h] += 1

    global_max = 0
    for matrix in byRoute.values():
        for row_arr in matrix:
            m = max(row_arr)
            if m > global_max:
                global_max = m

    out = {
        "byRoute": {rid: {str(d): mat[d] for d in range(7)} for rid, mat in byRoute.items()},
        "globalMax": global_max,
        "dayNames": ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    }

    out_path = OUT_DIR / "service_metrics.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(
        f"OK -> {out_path.relative_to(ROOT)} "
        f"({out_path.stat().st_size / 1e6:.2f} MB, {len(byRoute)} líneas, "
        f"max global = {global_max} exp/h)"
    )


if __name__ == "__main__":
    main()
