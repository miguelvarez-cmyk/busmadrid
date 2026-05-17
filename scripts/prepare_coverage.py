"""
Transforma madrid_bus_coverage.json (del proyecto asignador_poblacion)
al formato byRoute que consume el frontend del visualizador.

Entrada:  D:/Vibecoding/bus_madrid/asignador_poblacion/output/madrid_bus_coverage.json
Salida:   public/data/route_coverage.json
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("D:/Vibecoding/bus_madrid/asignador_poblacion/output/madrid_bus_coverage.json")
DST = ROOT / "public" / "data" / "route_coverage.json"


def main():
    if not SRC.exists():
        raise FileNotFoundError(
            f"No se encuentra el archivo de cobertura: {SRC}\n"
            "Ejecuta primero 04_coverage_analysis.py en el proyecto asignador_poblacion."
        )

    with open(SRC, encoding="utf-8") as f:
        raw = json.load(f)

    distances = raw["distances"]
    total_population = raw["total_population"]

    by_route = {}
    for route in raw["routes"]:
        rid = route["route_id"]
        by_route[rid] = {str(d): route["coverage"].get(str(d), 0.0) for d in distances}

    out = {
        "byRoute": by_route,
        "distances": distances,
        "total_population": total_population,
    }

    DST.parent.mkdir(parents=True, exist_ok=True)
    with open(DST, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Escrito: {DST}")
    print(f"  {len(by_route)} rutas x {len(distances)} distancias")
    print(f"  Poblacion total: {total_population:,.0f} hab")


if __name__ == "__main__":
    main()
