# CLAUDE.md

Guía para que Claude Code colabore en este proyecto.

## Propósito

Visualizador interactivo del feed **GTFS de la EMT (Empresa Municipal de Transportes) de Madrid**. Renderiza paradas, recorridos y — cuando esté disponible — posiciones de vehículos en tiempo real sobre un mapa, con filtros por línea, modo y franja horaria. Pensado para análisis de cobertura y exploración del transporte público.

## Stack

- **Frontend:** React 18 + Vite 5
- **Mapa / visualización:** Deck.gl 9 (`@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/react`) sobre MapLibre GL JS vía `react-map-gl/maplibre`
- **Estado global:** Zustand (`src/store/`)
- **Procesamiento de datos:** Python 3.10+ con `pandas`, `geopandas`, `shapely`
- **Estilo de mapa base:** CARTO Dark Matter (vector tiles gratuitos)
- **Linter:** ESLint con plugins de React

## Estructura

```
visualizador_GTFS_Madrid/
├── data/
│   ├── raw/              # Feed GTFS original (.txt) — NO se versiona
│   └── processed/        # GeoJSON listos para el frontend — NO se versiona
├── scripts/              # Pipeline Python: GTFS → GeoJSON
├── src/
│   ├── components/map/   # Componentes React del mapa (overlays, controles, tooltips)
│   ├── layers/           # Factories de capas Deck.gl (StopsLayer, RoutesLayer…)
│   ├── store/            # Stores Zustand
│   ├── utils/            # Helpers puros (formatters, parsers, geo helpers)
│   ├── config/           # Constantes (mapConfig, paletas, viewport inicial)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/               # Assets estáticos servidos tal cual
├── index.html
├── vite.config.js
├── package.json
└── CLAUDE.md
```

## Procesar el GTFS

1. Descargar el feed GTFS de la EMT desde el portal de datos abiertos del Ayuntamiento de Madrid o del CRTM.
2. Descomprimir el ZIP en `data/raw/` — debe contener al menos `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `shapes.txt`.
3. Ejecutar el pipeline:

   ```bash
   python scripts/process_gtfs.py
   ```

   Genera en `data/processed/`:
   - `stops.geojson` — paradas (Point)
   - `routes.geojson` — recorridos agregados por línea (MultiLineString, derivados de `shapes.txt`)
   - `routes_meta.json` — metadatos por línea (id, nombre, modo, color)

4. El frontend carga estos archivos vía `fetch` desde `/data/processed/` (Vite los sirve si están dentro de `public/` o se referencian con import).

> Si añades un nuevo paso de procesamiento, créalo como script aparte en `scripts/` con un nombre descriptivo (`build_frequencies.py`, `extract_vehicles.py`…) y documenta la entrada/salida arriba del archivo.

## Convenciones de código

### JavaScript / React
- **ES modules** con `import`/`export`. Extensiones explícitas en imports relativos (`./foo.js`).
- **Componentes funcionales** con hooks. Sin clases.
- **Nombres:** `PascalCase` para componentes y archivos de componentes; `camelCase` para utilidades, hooks (`useXxx`) y variables.
- **Capas de Deck.gl:** una factoría por capa en `src/layers/`, exportando una función `createXxxLayer(data, options)` que devuelve la instancia. No instanciar capas dentro de los componentes.
- **Estado:** lo que sea compartido entre componentes va en un store Zustand en `src/store/`. Lo local se queda con `useState`.
- **Selectors:** exportar selectores nominales (`useViewState`, `useVisibleLayers`) en lugar de hacer `useStore(s => s.x)` esparcido por la app.
- **Sin comentarios decorativos.** Solo comentar el *porqué* cuando no sea obvio.
- **Sin TypeScript** por ahora — el proyecto es JS puro para mantener la fricción baja.

### Python (scripts)
- Scripts ejecutables con `if __name__ == "__main__":`.
- Rutas relativas a la raíz del proyecto vía `pathlib.Path(__file__).resolve().parents[1]`.
- Validar la presencia de los archivos GTFS de entrada antes de procesar; fallar con un error claro si faltan.
- Salidas siempre a `data/processed/` con nombres estables (sobrescribir está bien).

### Git
- Commits en castellano, en imperativo: *"añade capa de paradas"*, *"corrige parseo de shapes.txt"*.
- No commitear nada bajo `data/raw/` ni GeoJSON pesados en `data/processed/` (ya está en `.gitignore`).
- No commitear `node_modules/` ni archivos `.env`.

### Rendimiento
- Los GeoJSON pueden ser grandes (decenas de MB). Preferir capas binarias de Deck.gl (`GeoJsonLayer` con `data` como objeto ya parseado) y evitar re-cargas innecesarias.
- Memoizar capas con `useMemo` cuando dependan de filtros del store.

## Comandos útiles

```bash
npm run dev       # Servidor de desarrollo (http://localhost:5173)
npm run build     # Build de producción a dist/
npm run preview   # Sirve el build localmente
npm run lint      # ESLint
```
