"""
Calcula la primera y última hora de salida exacta (HH:MM) por línea y tipo de día.

Utiliza la hora de salida de la primera parada de cada expedición (cabecera)
para obtener la primera salida global y la última salida global de cada línea.

Entradas:
  - data/raw/GTFS_EMT/trips.txt        (route_id, service_id, trip_id, direction_id)
  - data/raw/GTFS_EMT/stop_times.txt   (trip_id, stop_sequence, departure_time)
  - data/raw/GTFS_EMT/calendar.txt     (service_id, monday..sunday)

Salida: public/data/route_departure_times.json
  {
    "byRoute": {
      "<route_id>": {
        "LA": { "primera": "06:15", "última": "23:47" },
        "SA": { "primera": "06:30", "última": "23:15" },
        "FE": { "primera": "07:00", "última": "22:30" }
      }
    }
  }
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GTFS_DIR = ROOT / "data" / "raw" / "GTFS_EMT"
OUT_DIR = ROOT / "public" / "data"


def parse_gtfs_time_minutes(s: str) -> float:
    """Convierte HH:MM:SS a minutos desde medianoche (admite HH >= 24)."""
    h, m, sec = s.strip().split(":")
    return int(h) * 60 + int(m) + int(sec) / 60


def minutes_to_hhmm(minutes: float) -> str:
    """Convierte minutos desde medianoche a HH:MM.
    Tiempos >=24h (nocturnos GTFS) se presentan módulo 24 para mostrar la hora real del reloj."""
    total = int(round(minutes))
    h = (total // 60) % 24
    m = total % 60
    return f"{h:02d}:{m:02d}"


def build_svc_daytype_df() -> pd.DataFrame:
    cal = pd.read_csv(GTFS_DIR / "calendar.txt", dtype={"service_id": str})
    rows: list[dict] = []
    wkday_cols = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    for _, row in cal.iterrows():
        sid = row["service_id"]
        if any(row.get(d, 0) == 1 for d in wkday_cols):
            rows.append({"service_id": sid, "day_type": "LA"})
        if row.get("saturday", 0) == 1:
            rows.append({"service_id": sid, "day_type": "SA"})
        if row.get("sunday", 0) == 1:
            rows.append({"service_id": sid, "day_type": "FE"})
    return pd.DataFrame(rows)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for fname in ("trips.txt", "stop_times.txt", "calendar.txt"):
        if not (GTFS_DIR / fname).exists():
            raise FileNotFoundError(
                f"Falta {(GTFS_DIR / fname).relative_to(ROOT)}\n"
                "Descomprime el feed GTFS de la EMT en data/raw/GTFS_EMT/"
            )

    print("Cargando trips.txt...")
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        dtype={"route_id": str, "service_id": str, "trip_id": str},
        usecols=["route_id", "service_id", "trip_id"],
    )
    print(f"  {len(trips):,} trips, {trips['route_id'].nunique()} líneas")

    print("Cargando stop_times.txt (primera parada por trip)...")
    st = pd.read_csv(
        GTFS_DIR / "stop_times.txt",
        dtype={"trip_id": str},
        usecols=["trip_id", "stop_sequence", "departure_time"],
    )
    first_stop = (
        st.sort_values("stop_sequence")
        .groupby("trip_id", as_index=False)
        .first()[["trip_id", "departure_time"]]
    )
    first_stop["dep_min"] = first_stop["departure_time"].apply(parse_gtfs_time_minutes)
    print(f"  {len(first_stop):,} trips con primera parada")

    print("Construyendo mapeado service_id -> tipo de día...")
    svc_dt = build_svc_daytype_df()

    merged = (
        trips.merge(first_stop, on="trip_id", how="inner")
             .merge(svc_dt, on="service_id", how="inner")
    )

    grouped = merged.groupby(["route_id", "day_type"])["dep_min"].agg(["min", "max"]).reset_index()

    by_route: dict = {}
    for _, row in grouped.iterrows():
        rid = row["route_id"]
        dt = row["day_type"]
        if rid not in by_route:
            by_route[rid] = {}
        by_route[rid][dt] = {
            "primera": minutes_to_hhmm(row["min"]),
            "última": minutes_to_hhmm(row["max"]),
        }

    out = {"byRoute": by_route}
    out_path = OUT_DIR / "route_departure_times.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Escrito: {out_path.relative_to(ROOT)} ({out_path.stat().st_size / 1024:.1f} KB)")
    print(f"  {len(by_route)} líneas con datos de horario")


if __name__ == "__main__":
    main()
