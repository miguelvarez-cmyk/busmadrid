# Visualizador GTFS Madrid

Visualizador interactivo de datos GTFS (General Transit Feed Specification) del transporte público de Madrid, construido con React, Vite y Deck.gl.

## Estructura del proyecto

```
visualizador_GTFS_Madrid/
├── data/
│   ├── raw/              # Datos GTFS originales (.txt del feed)
│   └── processed/        # Datos procesados a GeoJSON listos para el frontend
├── scripts/              # Scripts Python para procesar GTFS → GeoJSON
├── src/
│   ├── components/
│   │   └── map/          # Componentes de React relacionados con el mapa
│   ├── layers/           # Capas de Deck.gl (rutas, paradas, vehículos…)
│   ├── utils/            # Utilidades (parsers, helpers, formatters)
│   └── config/           # Configuración (estilos de mapa, constantes, viewport)
├── public/               # Assets estáticos servidos por Vite
├── package.json
├── .gitignore
└── README.md
```

## Requisitos

- Node.js >= 18
- Python >= 3.10 (para los scripts de procesamiento)

## Instalación

```bash
npm install
```

Para los scripts de procesamiento Python (recomendado en un entorno virtual):

```bash
pip install pandas geopandas shapely
```

## Uso

### 1. Procesar datos GTFS

Coloca el feed GTFS de Madrid (descomprimido) en `data/raw/GTFS/` y ejecuta el pipeline completo:

```bash
python scripts/process_gtfs.py
python scripts/compute_service.py
python scripts/compute_stop_expeditions.py
```

Los GeoJSON resultantes se guardan en `public/data/` (servidos estáticamente por Vite).

### 2. Lanzar el visualizador

```bash
npm run dev
```

Abre http://localhost:5173 en el navegador.

## Fuentes de datos

- [Consorcio Regional de Transportes de Madrid (CRTM)](https://www.crtm.es/)
- Especificación GTFS: https://gtfs.org/
