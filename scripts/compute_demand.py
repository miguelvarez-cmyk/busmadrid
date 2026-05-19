"""
Calcula la demanda media diaria por línea EMT a partir de los CSVs en:
  - data/raw/demanda/demandadialinea_2023.csv
  - data/raw/demanda/demandadialinea_2024(1).csv
  - data/raw/demanda/demandadialinea_2025.csv
  - data/raw/demanda/demandadialinea_2026.csv  (solo enero)

Catálogo de rutas válidas: data/raw/GTFS_EMT/routes.txt (columna route_id)

Salida: public/data/route_demand.json
  {
    "byRoute": {
      "<route_id>": {
        "byYear": {
          "2023": { "dailyAvg": int, "total": int, "days": int },
          "2024": { ... },
          "2025": { ... }
        },
        "monthly": { "2025": [ene, feb, ..., dic] },  # avg viajeros/día por mes
        "dowProfile": { "2025": { "weekday": int, "weekend": int } },
        "dailyAvg": int   # = byYear["2025"].dailyAvg (retrocompatibilidad)
      }
    },
    "byYear": {
      "2023": { "min": int, "max": int },
      "2024": { "min": int, "max": int },
      "2025": { "min": int, "max": int }
    },
    "min": int,   # = byYear["2025"].min
    "max": int,   # = byYear["2025"].max
    "year": "2025"
  }
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
DEMAND_DIR = RAW_DIR / "demanda"
OUT_DIR = ROOT / "public" / "data"

CSVS = {
    2023: DEMAND_DIR / "demandadialinea_2023.csv",
    2024: DEMAND_DIR / "demandadialinea_2024(1).csv",
    2025: DEMAND_DIR / "demandadialinea_2025.csv",
    2026: DEMAND_DIR / "demandadialinea_2026.csv",
}

MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
               "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


def load_csv(path: Path, year: int) -> pd.DataFrame:
    df = pd.read_csv(path, sep=";", encoding="utf-8-sig", dtype={"Linea": str})
    df["Linea"] = df["Linea"].str.strip()
    if year == 2026:
        df["Fecha"] = pd.to_datetime(df["Fecha"], dayfirst=True)
        df["Linea"] = df["Linea"].apply(lambda x: str(int(x)).zfill(3))
    else:
        df["Fecha"] = pd.to_datetime(df["Fecha"])
    df["year"] = year
    df["month"] = df["Fecha"].dt.month      # 1-12
    df["dow"] = df["Fecha"].dt.dayofweek    # 0=Lun … 6=Dom
    return df


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Catálogo de rutas válidas desde GTFS actual
    routes_path = RAW_DIR / "GTFS_EMT" / "routes.txt"
    routes_cat = pd.read_csv(routes_path, dtype={"route_id": str})
    valid = set(routes_cat["route_id"].dropna().str.strip().unique())
    print(f"Catálogo GTFS: {len(valid)} rutas válidas")

    # Cargar y concatenar todos los CSVs
    frames = []
    for year, path in CSVS.items():
        print(f"Cargando {path.name}...")
        df = load_csv(path, year)
        print(f"  {len(df)} filas, {df['Linea'].nunique()} líneas, "
              f"fechas {df['Fecha'].min().date()} - {df['Fecha'].max().date()}")
        frames.append(df)

    all_data = pd.concat(frames, ignore_index=True)

    # Filtrar a rutas en el catálogo GTFS
    in_catalog = all_data[all_data["Linea"].isin(valid)].copy()
    dropped = all_data["Linea"].nunique() - in_catalog["Linea"].nunique()
    if dropped:
        print(f"Descartadas {dropped} líneas no presentes en el GTFS actual")

    # --- Agregación 1: dailyAvg por (year, línea) ---
    agg_year = (
        in_catalog.groupby(["year", "Linea"])["TotalViajeros"]
        .agg(total="sum", days="count")
        .reset_index()
    )
    agg_year["dailyAvg"] = (agg_year["total"] / agg_year["days"]).round().astype(int)

    # --- Agregación 2: media diaria por (year, línea, month) ---
    # Primero agrupamos por (year, línea, fecha, month) para obtener total/día,
    # luego promediamos los días de cada mes
    daily = (
        in_catalog.groupby(["year", "Linea", "Fecha", "month"])["TotalViajeros"]
        .sum()
        .reset_index()
    )
    agg_month = (
        daily.groupby(["year", "Linea", "month"])["TotalViajeros"]
        .mean()
        .round()
        .astype(int)
        .reset_index()
    )

    # --- Agregación 3: weekday vs weekend por (year, línea) ---
    # dow 0-4 = laborable, 5-6 = fin de semana
    in_catalog["is_weekend"] = in_catalog["dow"] >= 5
    daily2 = (
        in_catalog.groupby(["year", "Linea", "Fecha", "is_weekend"])["TotalViajeros"]
        .sum()
        .reset_index()
    )
    agg_dow = (
        daily2.groupby(["year", "Linea", "is_weekend"])["TotalViajeros"]
        .mean()
        .round()
        .astype(int)
        .reset_index()
    )

    # --- Construir estructura byRoute ---
    routes = sorted(in_catalog["Linea"].unique())
    years_complete = [2023, 2024, 2025]  # 2026 solo enero, no se expone en UI
    all_years = [2023, 2024, 2025, 2026]

    byRoute = {}
    for route in routes:
        entry: dict = {}

        # byYear (todos los años incluyendo 2026 para completitud)
        by_year: dict = {}
        for y in all_years:
            row = agg_year[(agg_year["year"] == y) & (agg_year["Linea"] == route)]
            if not row.empty:
                r = row.iloc[0]
                by_year[str(y)] = {
                    "dailyAvg": int(r["dailyAvg"]),
                    "total": int(r["total"]),
                    "days": int(r["days"]),
                }
        if not by_year:
            continue
        entry["byYear"] = by_year

        # monthly (todos los años)
        monthly: dict = {}
        for y in all_years:
            month_rows = agg_month[
                (agg_month["year"] == y) & (agg_month["Linea"] == route)
            ]
            if not month_rows.empty:
                arr = [None] * 12
                for _, mr in month_rows.iterrows():
                    arr[int(mr["month"]) - 1] = int(mr["TotalViajeros"])
                monthly[str(y)] = arr
        if monthly:
            entry["monthly"] = monthly

        # dowProfile (todos los años)
        dow_profile: dict = {}
        for y in all_years:
            dow_rows = agg_dow[
                (agg_dow["year"] == y) & (agg_dow["Linea"] == route)
            ]
            if not dow_rows.empty:
                profile: dict = {}
                wday = dow_rows[dow_rows["is_weekend"] == False]
                wend = dow_rows[dow_rows["is_weekend"] == True]
                if not wday.empty:
                    profile["weekday"] = int(wday.iloc[0]["TotalViajeros"])
                if not wend.empty:
                    profile["weekend"] = int(wend.iloc[0]["TotalViajeros"])
                if profile:
                    dow_profile[str(y)] = profile
        if dow_profile:
            entry["dowProfile"] = dow_profile

        # dailyAvg retrocompat = valor de 2025 (o el año más reciente disponible)
        for fallback_year in ["2025", "2024", "2023"]:
            if fallback_year in by_year:
                entry["dailyAvg"] = by_year[fallback_year]["dailyAvg"]
                break

        byRoute[route] = entry

    # --- byYear min/max (solo años completos, excluyendo 2026) ---
    by_year_stats: dict = {}
    for y in years_complete:
        avgs = [
            byRoute[r]["byYear"][str(y)]["dailyAvg"]
            for r in byRoute
            if str(y) in byRoute[r].get("byYear", {})
        ]
        if avgs:
            by_year_stats[str(y)] = {"min": int(min(avgs)), "max": int(max(avgs))}

    # min/max globales = 2025
    global_min = by_year_stats.get("2025", {}).get("min", 0)
    global_max = by_year_stats.get("2025", {}).get("max", 0)

    out = {
        "byRoute": byRoute,
        "byYear": by_year_stats,
        "min": global_min,
        "max": global_max,
        "year": "2025",
    }

    out_path = OUT_DIR / "route_demand.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = out_path.stat().st_size / 1e3
    print(
        f"\nOK -> {out_path.relative_to(ROOT)} "
        f"({size_kb:.1f} KB, {len(byRoute)} líneas)\n"
        f"  byYear: {list(by_year_stats.keys())}\n"
        f"  2025 -> min={global_min:,} max={global_max:,} viajeros/dia"
    )


if __name__ == "__main__":
    main()
