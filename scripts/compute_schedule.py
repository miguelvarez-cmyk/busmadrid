"""
Calcula la amplitud del horario de servicio por línea EMT y tipo de día.

"Amplitud" = media de (última salida - primera salida) desde cada cabecera
(sentido 0 y sentido 1). La "cabecera" es la primera parada de la expedición
(stop_sequence mínimo), que equivale a la hora a la que el bus sale de su
terminal de origen.

Entradas:
  - data/raw/GTFS/trips.txt        (route_id, service_id, trip_id, direction_id)
  - data/raw/GTFS/stop_times.txt   (trip_id, stop_sequence, departure_time)
  - data/raw/GTFS/calendar.txt     (service_id, monday..sunday)

Tipos de día (misma clasificación que compute_fleet.py):
  - LA: el servicio opera algún día de lunes a viernes
  - SA: el servicio opera en sábado
  - FE: el servicio opera en domingo

Salida: public/data/route_schedule.json
  {
    "byRoute": {
      "<route_id>": { "LA": <min>|null, "SA": <min>|null, "FE": <min>|null }
    },
    "min": float,
    "max": float
  }

El valor es la amplitud en minutos (media de los dos sentidos).
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


def build_svc_daytype_df() -> pd.DataFrame:
    """Devuelve un DataFrame con columnas service_id, day_type para cada tipo
    de día (LA/SA/FE) que opera el servicio."""
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
                "Descomprime el feed GTFS de la EMT en data/raw/GTFS/"
            )

    print("Cargando trips.txt...")
    trips = pd.read_csv(
        GTFS_DIR / "trips.txt",
        dtype={"route_id": str, "service_id": str, "trip_id": str, "direction_id": str},
        usecols=["route_id", "service_id", "trip_id", "direction_id"],
    )
    print(f"  {len(trips):,} trips, {trips['route_id'].nunique()} líneas")

    print("Cargando stop_times.txt (primera parada por trip)...")
    st = pd.read_csv(
        GTFS_DIR / "stop_times.txt",
        dtype={"trip_id": str},
        usecols=["trip_id", "stop_sequence", "departure_time"],
    )
    # Primer stop de cada trip = stop_sequence mínimo
    first_stop = (
        st.sort_values("stop_sequence")
        .groupby("trip_id", as_index=False)
        .first()[["trip_id", "departure_time"]]
    )
    first_stop["dep_min"] = first_stop["departure_time"].apply(parse_gtfs_time_minutes)
    print(f"  {len(first_stop):,} trips con primera parada")

    print("Construyendo mapeado service_id -> tipo de dia...")
    svc_dt = build_svc_daytype_df()
    print(f"  {svc_dt['service_id'].nunique()} service_ids, {len(svc_dt)} filas expandidas")

    # Unir: trip_id → (route_id, direction_id, dep_min)
    trips_dep = trips.merge(first_stop[["trip_id", "dep_min"]], on="trip_id", how="inner")

    # Expandir: cada trip puede pertenecer a varios tipos de día
    trips_expanded = trips_dep.merge(svc_dt, on="service_id", how="inner")

    # Span por (route_id, day_type, direction_id):
    #   span = max(dep_min) - min(dep_min) para todos los trips del grupo
    grouped = (
        trips_expanded.groupby(["route_id", "day_type", "direction_id"])["dep_min"]
        .agg(lambda x: x.max() - x.min() if len(x) >= 2 else float("nan"))
        .reset_index()
        .rename(columns={"dep_min": "span"})
    )
    grouped = grouped[grouped["span"].notna()]

    # Media de spans entre sentidos (0 y 1) para cada (route, day_type)
    route_day_avg = (
        grouped.groupby(["route_id", "day_type"])["span"]
        .mean()
        .round(1)
        .reset_index()
    )

    # Pivotear a { route_id: {LA: val, SA: val, FE: val} }
    pivot = route_day_avg.pivot(index="route_id", columns="day_type", values="span")
    for col in ("LA", "SA", "FE"):
        if col not in pivot.columns:
            pivot[col] = float("nan")

    by_route: dict[str, dict] = {}
    for route_id, row in pivot.iterrows():
        entry = {
            dt: round(float(row[dt]), 1) if pd.notna(row[dt]) else None
            for dt in ("LA", "SA", "FE")
        }
        if any(v is not None for v in entry.values()):
            by_route[route_id] = entry

    all_values = [v for e in by_route.values() for v in e.values() if v is not None]
    if not all_values:
        raise RuntimeError("No se han calculado spans de servicio. Revisa los GTFS.")

    out = {
        "byRoute": by_route,
        "min": round(min(all_values), 1),
        "max": round(max(all_values), 1),
    }

    out_path = OUT_DIR / "route_schedule.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(
        f"OK -> {out_path.relative_to(ROOT)} "
        f"({out_path.stat().st_size / 1e3:.1f} KB, {len(by_route)} líneas, "
        f"amplitud {out['min']:.0f}–{out['max']:.0f} min)"
    )


if __name__ == "__main__":
    main()
