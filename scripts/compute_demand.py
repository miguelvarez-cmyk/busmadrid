"""
Calcula la demanda media diaria por línea EMT a partir de:
  - data/raw/linesemt.csv         (catálogo de líneas EMT, columna 'line')
  - data/raw/demandadialinea_2025.csv  (demanda diaria 2025: Fecha, Linea, TotalViajeros)

Salida: public/data/route_demand.json
  {
    "byRoute": { "<route_id>": { "dailyAvg": int, "total": int, "days": int } },
    "min": int, "max": int,
    "year": "2025"
  }

La demanda media se calcula como suma anual / nº de días con dato. Las líneas
que aparecen en demanda pero no están en linesemt se descartan (filtra líneas
históricas o numeraciones obsoletas).
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "public" / "data"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Cargando linesemt.csv...")
    lines = pd.read_csv(RAW_DIR / "linesemt.csv", dtype={"line": str})
    valid = set(lines["line"].dropna().unique())
    print(f"  {len(valid)} route_ids en el catálogo")

    print("Cargando demandadialinea_2025.csv...")
    demand = pd.read_csv(
        RAW_DIR / "demandadialinea_2025.csv",
        sep=";",
        encoding="utf-8-sig",
        dtype={"Linea": str},
    )
    print(f"  {len(demand)} filas, {demand['Linea'].nunique()} líneas, "
          f"fechas {demand['Fecha'].min()} -> {demand['Fecha'].max()}")

    in_catalog = demand[demand["Linea"].isin(valid)]
    dropped = demand["Linea"].nunique() - in_catalog["Linea"].nunique()
    if dropped:
        print(f"  {dropped} líneas presentes en demanda pero no en linesemt (descartadas)")

    agg = (
        in_catalog.groupby("Linea")["TotalViajeros"]
        .agg(total="sum", days="count")
        .reset_index()
    )
    agg["daily_avg"] = (agg["total"] / agg["days"]).round().astype(int)

    byRoute = {
        row.Linea: {
            "dailyAvg": int(row.daily_avg),
            "total": int(row.total),
            "days": int(row.days),
        }
        for row in agg.itertuples(index=False)
    }

    daily_avgs = [v["dailyAvg"] for v in byRoute.values()]
    out = {
        "byRoute": byRoute,
        "min": int(min(daily_avgs)),
        "max": int(max(daily_avgs)),
        "year": "2025",
    }

    out_path = OUT_DIR / "route_demand.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(
        f"OK -> {out_path.relative_to(ROOT)} "
        f"({out_path.stat().st_size / 1e3:.1f} KB, {len(byRoute)} líneas, "
        f"min={out['min']} max={out['max']} viajeros/día)"
    )


if __name__ == "__main__":
    main()
