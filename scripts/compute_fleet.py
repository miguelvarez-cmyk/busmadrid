"""
Calcula la flota (nº de coches en circulación) por línea EMT y tipo de día
a partir de:
  - data/raw/2026ccr.csv  (Linea;FECHASER;TIPODIAMO;CodFranja;NumCCReal)

TIPODIAMO -> LA: laborable, SA: sábado, FE: domingo / festivo.
NumCCReal es el nº de coches asignados a la línea en una franja horaria
concreta. La "flota" representativa de la línea para un tipo de día se toma
como el MÁXIMO de NumCCReal a lo largo del día (= flota en hora punta), que es
la métrica operativa habitual: cuántos buses se necesitan para mantener el
servicio cuando hay más demanda.

Para suavizar ruido entre fechas (días con incidencias, festivos atípicos...)
se promedia la flota punta de cada fecha del mismo TIPODIAMO y se redondea.

Salida: public/data/route_fleet.json
  {
    "byRoute": { "<route_id>": { "LA": int, "SA": int, "FE": int } },
    "min": int, "max": int,
    "year": "2026"
  }
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "public" / "data"

DAY_TYPES = ("LA", "SA", "FE")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    src = RAW_DIR / "2026ccr.csv"
    if not src.exists():
        raise FileNotFoundError(f"Falta {src.relative_to(ROOT)}")

    print(f"Cargando {src.name}...")
    df = pd.read_csv(
        src,
        sep=";",
        encoding="utf-8-sig",
        dtype={"Linea": str, "TIPODIAMO": str},
    )
    print(f"  {len(df):,} filas, {df['Linea'].nunique()} líneas, "
          f"tipos {sorted(df['TIPODIAMO'].dropna().unique())}")

    # Flota punta por (línea, fecha): máximo NumCCReal en todas las franjas.
    peak_by_date = (
        df.groupby(["Linea", "FECHASER", "TIPODIAMO"], as_index=False)["NumCCReal"]
        .max()
        .rename(columns={"NumCCReal": "peak"})
    )

    # Media de la flota punta por (línea, tipo de día) sobre todas las fechas
    # de ese tipo. Redondeamos al entero más cercano.
    avg_peak = (
        peak_by_date.groupby(["Linea", "TIPODIAMO"])["peak"]
        .mean()
        .round()
        .astype(int)
        .unstack(fill_value=0)
    )

    by_route: dict[str, dict[str, int]] = {}
    for line, row in avg_peak.iterrows():
        entry = {dt: int(row.get(dt, 0)) for dt in DAY_TYPES}
        if any(v > 0 for v in entry.values()):
            by_route[line] = entry

    all_values = [v for entry in by_route.values() for v in entry.values() if v > 0]
    out = {
        "byRoute": by_route,
        "min": int(min(all_values)),
        "max": int(max(all_values)),
        "year": "2026",
    }

    out_path = OUT_DIR / "route_fleet.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(
        f"OK -> {out_path.relative_to(ROOT)} "
        f"({out_path.stat().st_size / 1e3:.1f} KB, {len(by_route)} líneas, "
        f"min={out['min']} max={out['max']} buses)"
    )


if __name__ == "__main__":
    main()
