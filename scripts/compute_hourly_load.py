"""
Calcula el perfil horario de viajeros por línea EMT y tipo de día, para derivar
en el frontend la carga por hora (viajeros subidos por expedición) cruzándolo
con las expediciones por hora de service_metrics.json.

Entrada:
  - data/raw/demanda/{AAAA}demdialineafranjaanual.csv   (o {AAAA}_dem_linea_franja.csv)
    Fecha;Linea;Franja;TotalViajeros — Franja H00–H23 (hora del día) y
    M00–M07 (madrugada del mismo día de servicio, horas 24–31). Las M se
    asignan a la hora 0–7, igual que compute_service.py pliega las horas
    >= 24 del GTFS sobre el mismo día de servicio.
  - data/raw/GTFS_EMT/routes.txt (catálogo de rutas válidas)

Periodo de referencia: año YEAR excluyendo EXCLUDED_MONTHS (verano: horarios y
demanda atípicos), para aproximarse al servicio de invierno del GTFS vigente.

Tipos de día:
  LA = lunes a viernes no festivo · SA = sábado · FE = domingo o festivo.
  Se compara la demanda total de la red de cada laborable con la mediana de
  los laborables de su mes: < HOLIDAY_RATIO → festivo (cuenta como FE);
  entre HOLIDAY_RATIO y ATYPICAL_RATIO → día atípico (vacaciones escolares,
  puentes), se excluye. En 2026 los festivos quedan <= 0,51 y los atípicos
  entre 0,69 y 0,80.

Salida: public/data/route_load_hourly.json
  {
    "meta": { "year": "2026", "from": "AAAA-MM-DD", "to": "AAAA-MM-DD",
              "excludedMonths": [7, 8], "excludedDays": n, "days": { "LA": n, "SA": n, "FE": n } },
    "byRoute": { "<route_id>": { "LA": [24], "SA": [24], "FE": [24] } }
                 # media de viajeros subidos en cada hora (enteros)
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

YEAR = 2026
EXCLUDED_MONTHS = [7, 8]
HOLIDAY_RATIO = 0.6
ATYPICAL_RATIO = 0.8
DAY_TYPES = ["LA", "SA", "FE"]


def demand_csv(year: int) -> Path:
    current = DEMAND_DIR / f"{year}demdialineafranjaanual.csv"
    return current if current.exists() else DEMAND_DIR / f"{year}_dem_linea_franja.csv"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    routes_cat = pd.read_csv(RAW_DIR / "GTFS_EMT" / "routes.txt", dtype={"route_id": str})
    valid = set(routes_cat["route_id"].dropna().str.strip())

    path = demand_csv(YEAR)
    print(f"Cargando {path.name}...")
    df = pd.read_csv(path, sep=";", encoding="utf-8-sig", dtype={"Linea": str, "Franja": str})
    df["Linea"] = df["Linea"].str.strip().str.zfill(3)
    df["TotalViajeros"] = pd.to_numeric(df["TotalViajeros"], errors="coerce").fillna(0)
    df["Fecha"] = pd.to_datetime(df["Fecha"])
    df = df[~df["Fecha"].dt.month.isin(EXCLUDED_MONTHS)]
    df["hour"] = df["Franja"].str[1:].astype(int) % 24

    # --- Tipo de día con detección de festivos por caída de demanda ---
    net = df.groupby("Fecha")["TotalViajeros"].sum().to_frame("total")
    net["dow"] = net.index.dayofweek
    net["month"] = net.index.month
    weekday = net["dow"] < 5
    median_wd = net[weekday].groupby("month")["total"].median()
    net["day_type"] = "LA"
    net.loc[net["dow"] == 5, "day_type"] = "SA"
    net.loc[net["dow"] == 6, "day_type"] = "FE"
    ratio = net["total"] / net["month"].map(median_wd)
    holiday = weekday & (ratio < HOLIDAY_RATIO)
    atypical = weekday & (ratio >= HOLIDAY_RATIO) & (ratio < ATYPICAL_RATIO)
    net.loc[holiday, "day_type"] = "FE"
    net = net[~atypical]
    fmt = lambda idx: ', '.join(d.strftime('%d/%m') for d in idx)
    print(f"Festivos detectados en laborable: {fmt(holiday[holiday].index)}")
    print(f"Laborables atípicos excluidos: {fmt(atypical[atypical].index)}")
    days = net["day_type"].value_counts().to_dict()

    df = df[df["Linea"].isin(valid)]
    df = df.merge(net[["day_type"]], left_on="Fecha", right_index=True)

    # Viajeros por (línea, fecha, hora) y media por tipo de día. Se promedia
    # sobre los días en que la línea operó (algún viajero ese día), rellenando
    # con 0 las horas sin viajeros.
    by_hour = df.groupby(["Linea", "day_type", "Fecha", "hour"])["TotalViajeros"].sum()
    op_days = df[df["TotalViajeros"] > 0].groupby(["Linea", "day_type"])["Fecha"].nunique()
    hourly_sum = by_hour.groupby(["Linea", "day_type", "hour"]).sum()

    byRoute: dict = {}
    for (linea, dt), n_days in op_days.items():
        sums = hourly_sum.loc[(linea, dt)] if (linea, dt) in hourly_sum.index.droplevel(2) else None
        if sums is None or n_days == 0:
            continue
        arr = [0] * 24
        for h, v in sums.items():
            arr[int(h)] = int(round(v / n_days))
        byRoute.setdefault(linea, {})[dt] = arr

    out = {
        "meta": {
            "year": str(YEAR),
            "from": str(df["Fecha"].min().date()),
            "to": str(df["Fecha"].max().date()),
            "excludedMonths": EXCLUDED_MONTHS,
            "excludedDays": int(atypical.sum()),
            "days": {k: int(days.get(k, 0)) for k in DAY_TYPES},
        },
        "byRoute": dict(sorted(byRoute.items())),
    }
    out_path = OUT_DIR / "route_load_hourly.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(
        f"OK -> {out_path.relative_to(ROOT)} ({out_path.stat().st_size / 1e3:.1f} KB, "
        f"{len(byRoute)} líneas) · días {out['meta']['days']}"
    )


if __name__ == "__main__":
    main()
