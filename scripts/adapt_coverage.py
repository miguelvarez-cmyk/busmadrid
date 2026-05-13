"""
Adapta la salida de asignador_poblacion/04_coverage_analysis.py
al formato que espera el visualizador busmadrid.

Entrada:  <repo_asignador>/output/madrid_bus_coverage.json
Salida:   public/data/route_coverage.json

Formato de entrada (madrid_bus_coverage.json):
{
  "generated": "...",
  "total_population": 3520000,
  "distances": [50, 100, ..., 800],
  "routes": [
    {
      "route_id": "1001",
      "short_name": "1",
      "coverage": { "50": 18450.5, "100": 45320.2, ..., "800": 285340.5 }
    }, ...
  ]
}

Formato de salida (route_coverage.json):
{
  "distances": [50, 100, ..., 800],
  "byRoute": {
    "001": { "50": 4200, "100": 12800, ..., "800": 89200 }
  },
  "min_100": ..., "max_100": ...,
  "min_200": ..., "max_200": ...,
  "min_400": ..., "max_400": ...,
  "min_800": ..., "max_800": ...
}

Uso:
  python scripts/adapt_coverage.py <ruta_al_madrid_bus_coverage.json>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "public" / "data" / "route_coverage.json"

STAT_DISTANCES = list(range(50, 850, 50))  # 50, 100, ..., 800


def _route_id_to_key(route_id: str) -> str:
    return route_id


def adapt(input_path: Path) -> None:
    with open(input_path, encoding="utf-8") as f:
        src = json.load(f)

    distances = [int(d) for d in src.get("distances", [])]
    routes_raw = src.get("routes", [])

    by_route: dict[str, dict[str, int]] = {}
    for r in routes_raw:
        key = _route_id_to_key(r["route_id"])
        coverage = r.get("coverage", {})
        by_route[key] = {str(d): int(round(coverage.get(str(d), 0))) for d in distances}

    out: dict = {"distances": distances, "byRoute": by_route}

    for d in STAT_DISTANCES:
        if d not in distances:
            continue
        values = [v[str(d)] for v in by_route.values() if str(d) in v]
        if values:
            out[f"min_{d}"] = min(values)
            out[f"max_{d}"] = max(values)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Escrito: {OUT_PATH}")
    print(f"  Líneas: {len(by_route)}")
    print(f"  Distancias: {distances}")
    for d in [100, 200, 400, 800]:
        if f"min_{d}" in out:
            print(f"  [{d}m] {out[f'min_{d}']:,} – {out[f'max_{d}']:,} hab")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/adapt_coverage.py <ruta_al_madrid_bus_coverage.json>")
        sys.exit(1)
    adapt(Path(sys.argv[1]))
