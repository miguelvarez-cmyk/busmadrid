"""
Calcula la demanda media diaria por línea EMT a partir de los CSVs de demanda
por día, línea y franja horaria publicados por EMT en datos.emtmadrid.es
(dataset 29b27217-429f-44a0-a90a-2db7f13529b6):

  - data/raw/demanda/{AAAA}_dem_linea_franja.csv     (2019–2025, del ZIP
    2019_2025_dem_linea_franja.zip)
  - data/raw/demanda/2026demdialineafranjaanual.csv  (año en curso, se
    actualiza mensualmente)

Formato de entrada (sep=";"): Fecha;Linea;Franja;TotalViajeros
  Fecha AAAA-MM-DD · Linea "001" · Franja H00–H23 (hora) y M00–M07
  (madrugada de líneas nocturnas) · TotalViajeros entero

Catálogo de rutas válidas: data/raw/GTFS_EMT/routes.txt (columna route_id)

Salida: public/data/route_demand.json
  {
    "byRoute": {
      "<route_id>": {
        "byYear": {
          "2025": { "dailyAvg": int, "total": int, "days": int },
          "2026": { "dailyAvg": int, "total": int, "days": int,
                    "prevSamePeriodAvg": int }   # solo años parciales
        },
        "monthly": { "2025": [ene, ..., dic] },   # media viajeros/día por mes
        "dowProfile": { "2025": { "weekday": int, "weekend": int } },
        "dailyAvg": int   # = último año completo (retrocompatibilidad)
      }
    },
    "byYear": {
      "2025": { "min": int, "max": int },
      "2026": { "min": int, "max": int, "partial": true,
                "from": "2026-01-01", "to": "2026-09-30" }
    },
    "years": ["2023", "2024", "2025", "2026"],
    "min": int, "max": int,   # = último año completo
    "year": "2025"            # último año completo (año por defecto en la UI)
  }
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
DEMAND_DIR = RAW_DIR / "demanda"
OUT_DIR = ROOT / "public" / "data"

# Años expuestos en la web. 2019–2022 están disponibles pero se omiten
# (pandemia y red antigua) para no inflar el JSON.
YEARS = [2023, 2024, 2025, 2026]


def csv_for_year(year: int) -> Path:
    historic = DEMAND_DIR / f"{year}_dem_linea_franja.csv"
    if historic.exists():
        return historic
    return DEMAND_DIR / f"{year}demdialineafranjaanual.csv"


def load_daily(path: Path, year: int) -> pd.DataFrame:
    """Carga un CSV por franja y lo agrega a viajeros por (Linea, Fecha)."""
    df = pd.read_csv(
        path, sep=";", encoding="utf-8-sig",
        dtype={"Linea": str, "Franja": str},
        usecols=["Fecha", "Linea", "TotalViajeros"],
    )
    df["Linea"] = df["Linea"].str.strip().str.zfill(3)
    df["TotalViajeros"] = pd.to_numeric(df["TotalViajeros"], errors="coerce").fillna(0)
    daily = df.groupby(["Linea", "Fecha"], as_index=False)["TotalViajeros"].sum()
    daily["Fecha"] = pd.to_datetime(daily["Fecha"])
    # Días sin ningún viajero en la línea = la línea no operó ese día
    daily = daily[daily["TotalViajeros"] > 0]
    daily["year"] = year
    daily["month"] = daily["Fecha"].dt.month      # 1-12
    daily["dow"] = daily["Fecha"].dt.dayofweek    # 0=Lun … 6=Dom
    return daily


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    routes_path = RAW_DIR / "GTFS_EMT" / "routes.txt"
    routes_cat = pd.read_csv(routes_path, dtype={"route_id": str})
    valid = set(routes_cat["route_id"].dropna().str.strip().unique())
    print(f"Catálogo GTFS: {len(valid)} rutas válidas")

    frames = []
    for year in YEARS:
        path = csv_for_year(year)
        print(f"Cargando {path.name}...")
        d = load_daily(path, year)
        print(f"  {d['Linea'].nunique()} líneas, "
              f"fechas {d['Fecha'].min().date()} - {d['Fecha'].max().date()}, "
              f"{int(d['TotalViajeros'].sum()):,} viajeros")
        frames.append(d)
    daily = pd.concat(frames, ignore_index=True)

    in_catalog = daily[daily["Linea"].isin(valid)].copy()
    dropped = daily["Linea"].nunique() - in_catalog["Linea"].nunique()
    if dropped:
        print(f"Descartadas {dropped} líneas no presentes en el GTFS actual")

    # Años parciales: los que no llegan al 31 de diciembre
    year_range = in_catalog.groupby("year")["Fecha"].agg(["min", "max"])
    partial = {
        y: (r["min"], r["max"]) for y, r in year_range.iterrows()
        if r["max"] < pd.Timestamp(year=int(y), month=12, day=31)
    }
    complete_years = [y for y in YEARS if y not in partial]
    last_complete = str(max(complete_years))
    for y, (a, b) in partial.items():
        print(f"Año parcial {y}: {a.date()} - {b.date()}")

    # --- dailyAvg por (year, línea) ---
    agg_year = (
        in_catalog.groupby(["year", "Linea"])["TotalViajeros"]
        .agg(total="sum", days="count")
        .reset_index()
    )
    agg_year["dailyAvg"] = (agg_year["total"] / agg_year["days"]).round().astype(int)

    # --- Para años parciales: media del mismo periodo del año anterior ---
    prev_same: dict[tuple[int, str], int] = {}
    for y, (a, b) in partial.items():
        prev = in_catalog[
            (in_catalog["year"] == y - 1)
            & (in_catalog["Fecha"] >= a - pd.DateOffset(years=1))
            & (in_catalog["Fecha"] <= b - pd.DateOffset(years=1))
        ]
        for linea, avg in prev.groupby("Linea")["TotalViajeros"].mean().items():
            prev_same[(y, linea)] = int(round(avg))

    # --- media diaria por (year, línea, month) ---
    agg_month = (
        in_catalog.groupby(["year", "Linea", "month"])["TotalViajeros"]
        .mean().round().astype(int).reset_index()
    )

    # --- laborable vs fin de semana por (year, línea) ---
    in_catalog["is_weekend"] = in_catalog["dow"] >= 5
    agg_dow = (
        in_catalog.groupby(["year", "Linea", "is_weekend"])["TotalViajeros"]
        .mean().round().astype(int).reset_index()
    )

    # Índices para construir byRoute sin filtrar el DataFrame por cada línea
    year_idx = {(r.year, r.Linea): r for r in agg_year.itertuples()}
    month_idx: dict[tuple[int, str], list] = {}
    for r in agg_month.itertuples():
        month_idx.setdefault((r.year, r.Linea), [None] * 12)[r.month - 1] = int(r.TotalViajeros)
    dow_idx: dict[tuple[int, str], dict] = {}
    for r in agg_dow.itertuples():
        key = "weekend" if r.is_weekend else "weekday"
        dow_idx.setdefault((r.year, r.Linea), {})[key] = int(r.TotalViajeros)

    byRoute = {}
    for route in sorted(in_catalog["Linea"].unique()):
        by_year, monthly, dow_profile = {}, {}, {}
        for y in YEARS:
            r = year_idx.get((y, route))
            if r is not None:
                by_year[str(y)] = {
                    "dailyAvg": int(r.dailyAvg),
                    "total": int(r.total),
                    "days": int(r.days),
                }
                if (y, route) in prev_same:
                    by_year[str(y)]["prevSamePeriodAvg"] = prev_same[(y, route)]
            if (y, route) in month_idx:
                monthly[str(y)] = month_idx[(y, route)]
            if (y, route) in dow_idx:
                dow_profile[str(y)] = dow_idx[(y, route)]
        if not by_year:
            continue
        entry = {"byYear": by_year, "monthly": monthly, "dowProfile": dow_profile}
        for fallback in sorted(complete_years, reverse=True):
            if str(fallback) in by_year:
                entry["dailyAvg"] = by_year[str(fallback)]["dailyAvg"]
                break
        byRoute[route] = entry

    by_year_stats: dict = {}
    for y in YEARS:
        avgs = [e["byYear"][str(y)]["dailyAvg"] for e in byRoute.values() if str(y) in e["byYear"]]
        if not avgs:
            continue
        stats = {"min": int(min(avgs)), "max": int(max(avgs))}
        if y in partial:
            a, b = partial[y]
            stats.update(partial=True, **{"from": str(a.date()), "to": str(b.date())})
        by_year_stats[str(y)] = stats

    out = {
        "byRoute": byRoute,
        "byYear": by_year_stats,
        "years": [str(y) for y in YEARS if str(y) in by_year_stats],
        "min": by_year_stats[last_complete]["min"],
        "max": by_year_stats[last_complete]["max"],
        "year": last_complete,
    }

    out_path = OUT_DIR / "route_demand.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = out_path.stat().st_size / 1e3
    print(
        f"\nOK -> {out_path.relative_to(ROOT)} "
        f"({size_kb:.1f} KB, {len(byRoute)} líneas)\n"
        f"  años: {out['years']} · año por defecto: {last_complete}"
    )


if __name__ == "__main__":
    main()
