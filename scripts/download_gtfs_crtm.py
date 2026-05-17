"""
Descarga los feeds GTFS de Metro y Cercanias del CRTM y los descomprime en:
  data/raw/GTFS_Metro/
  data/raw/GTFS_Cercanias/

Uso:
    python scripts/download_gtfs_crtm.py

Fuentes (ArcGIS Open Data del CRTM):
  Metro:     https://datos.crtm.es/datasets/5c7f2951962540d69ffe8f640d94c246
  Cercanias: https://datos.crtm.es/datasets/1a25440bf66f499bae2657ec7fb40144

Si la descarga automatica falla, descargalos manualmente y descomprimelos en
las carpetas indicadas arriba.
"""
from __future__ import annotations

import io
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

GTFS_SOURCES: dict[str, tuple[Path, list[str]]] = {
    "metro": (
        ROOT / "data" / "raw" / "GTFS_Metro",
        [
            "https://crtm.maps.arcgis.com/sharing/rest/content/items/5c7f2951962540d69ffe8f640d94c246/data",
        ],
    ),
    "cercanias": (
        ROOT / "data" / "raw" / "GTFS_Cercanias",
        [
            "https://crtm.maps.arcgis.com/sharing/rest/content/items/1a25440bf66f499bae2657ec7fb40144/data",
        ],
    ),
}


def download(url: str) -> bytes:
    print(f"  Descargando {url} ...")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 GTFS-Downloader/1.0"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    print(f"  Recibidos {len(data) / 1024 / 1024:.1f} MB")
    return data


def fetch_one(urls: list[str]) -> bytes | None:
    for url in urls:
        try:
            return download(url)
        except Exception as exc:
            print(f"    Error: {exc}")
    return None


def main() -> None:
    failed = []
    for mode, (out_dir, urls) in GTFS_SOURCES.items():
        print(f"\n[{mode.upper()}]")
        out_dir.mkdir(parents=True, exist_ok=True)
        raw = fetch_one(urls)
        if raw is None:
            print(f"  No se pudo descargar el GTFS de {mode}.")
            failed.append(mode)
            continue
        print(f"  Descomprimiendo en {out_dir} ...")
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            zf.extractall(out_dir)
        files = [p.name for p in out_dir.iterdir()]
        print(f"  Archivos extraidos: {files}")

    if failed:
        print(
            f"\nFalló la descarga de: {', '.join(failed)}\n"
            "Descarga manualmente desde:\n"
            "  Metro:     https://datos.crtm.es/datasets/5c7f2951962540d69ffe8f640d94c246\n"
            "  Cercanias: https://datos.crtm.es/datasets/1a25440bf66f499bae2657ec7fb40144\n"
            "y descomprime en data/raw/GTFS_Metro/ y data/raw/GTFS_Cercanias/ respectivamente.\n"
        )
        sys.exit(1)

    print("\nListo. Ahora ejecuta: python scripts/process_metro_cercanias.py")


if __name__ == "__main__":
    main()
