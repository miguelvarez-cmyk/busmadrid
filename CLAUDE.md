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
2. Descomprimir el ZIP dentro de `data/raw/GTFS/` — debe contener al menos `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `shapes.txt`, `calendar.txt`.
   > **OJO:** los scripts esperan los archivos en `data/raw/GTFS/`, no directamente en `data/raw/`.
3. Ejecutar el pipeline:

   ```bash
   python scripts/process_gtfs.py
   python scripts/compute_service.py
   python scripts/compute_stop_expeditions.py
   # (y los compute_*.py adicionales: speed, demand, fleet, tortuosity, schedule)
   ```

   Genera en `public/data/` (servidos por Vite en `/data/`):
   - `routes.geojson` — recorridos agregados por línea (MultiLineString por route, ambos sentidos)
   - `routes_meta.json` — `{id, shortName, longName, color, type}` por línea
   - `service_metrics.json` — `byRoute[id][dow][dir][hour]` con expediciones por hora (`dow` 0–6 son string, lunes=0)
   - `stops.geojson` — feature por parada con `{stop_id, stop_name, stop_code, routes:[...]}`
   - `route_demand.json` — `byRoute[id] = {dailyAvg, total, days}` viajeros 2025
   - `route_fleet.json`, `route_speed.json`, `route_tortuosity.json`, `route_schedule.json`
   - `route_districts.json`, `barrios.geojson` — capas administrativas
   - `stop_expeditions.json` — `byStop[stop_id] = {peak}` (pico horario de expediciones laborables)

4. El frontend hace `fetch('/data/...')` desde [src/utils/useGTFSData.js](src/utils/useGTFSData.js).

> Si añades un nuevo paso de procesamiento, créalo como script aparte en `scripts/` con un nombre descriptivo y documenta la entrada/salida arriba del archivo. **Evita caracteres no-ASCII en `print()`** (la consola Windows con codepage cp1252 falla).

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

## Sidebar — estructura

El sidebar tiene **6 secciones** (acordeón). El orden es vinculante; si cambias [src/components/map/Sidebar.jsx](src/components/map/Sidebar.jsx), respeta:

1. **Líneas** — `LineSelector` (sin botón Área aquí; va en Barrios)
2. **Barrios** — botón `▭ Área` (toggle `boxSelectMode`) + `DistrictsPanel`
3. **Calidad de la Oferta** — `VisualizationControls` con exactamente 4 modos: `offer` (Frecuencia), `schedule` (Horario de Paso), `speed` (Velocidad), `tortuosity` (Tortuosidad)
4. **Paradas** — checkbox `showStops` + `StopRoutesPanel` + `StopExpeditionsPanel`
5. **Otros** — `OtrosPanel` con Flota, Demanda y Ocupación media
6. **Fondo** — `LayerToggles` (solo basemap)

**Modos de color (`colorMode` en el store):** `offer | schedule | speed | tortuosity | fleet | demand | occupancy | null`. Es **toggle**: clic en el modo activo lo desactiva → líneas en color por defecto.

**Modos de color de paradas (`stopColorMode`):** `routes | expeditions | null`. Mismo patrón toggle.

**Cálculo de ocupación media** (en `App.jsx`, `useMemo` sobre `serviceMetrics` + `routeDemand`):
```
occupancy[route_id] = routeDemand.byRoute[id].dailyAvg / total_trips_lunes
```
donde `total_trips_lunes` es la suma de `serviceMetrics.byRoute[id]["1"]["0"]` + `["1"]` para todas las horas. Lunes (`dow="1"`) se usa como representante de día laborable.

## Histograma — formato de bucket

El componente `Histogram` espera buckets con esta forma exacta:

```js
{ label: string, count: number, color: [r, g, b], inRange?: boolean }
```

`label` se usa como `key` y como texto. `color` es `rgb()` para la barra. Si falta cualquiera de los dos, **la barra no renderiza**. Las funciones `*Histogram` de [src/utils/service.js](src/utils/service.js) ya producen este formato — replícalo en cualquier histograma nuevo.

## Gradiente de color — consistencia global

**Todos los histogramas y capas de visualización DEBEN usar el mismo gradiente verde → amarillo → rojo para mantener consistencia visual:**

- Verde (mínimo): `[50, 200, 50]`
- Amarillo (medio): `[220, 200, 50]`
- Rojo (máximo): `[220, 50, 50]`

Fórmula de interpolación (t ∈ [0, 1]):
```js
if (t < 0.5) {
  const k = t / 0.5;  // primera mitad: verde→amarillo
  return [
    Math.round(50 + 170 * k),   // R: 50→220
    200,                        // G: constante
    50,                         // B: constante
  ];
}
const k = (t - 0.5) / 0.5;  // segunda mitad: amarillo→rojo
return [
  220,                        // R: constante
  Math.round(200 - 150 * k),  // G: 200→50
  50,                         // B: constante
];
```

Aplica este gradiente en:
- `fleetColor()`, `demandColor()`, `speedColor()`, `scheduleColor()` en [src/utils/service.js](src/utils/service.js)
- `stopRoutesColor()` en [src/utils/service.js](src/utils/service.js)
- `occupancyColorForRoute()` en [src/layers/createRoutesLayer.js](src/layers/createRoutesLayer.js)
- Buckets de histogramas en `StopExpeditionsPanel`, `OtrosPanel`
- Capas Deck.gl (`createRoutesLayer`, `createStopsLayer`)

## Estado (`useMapStore.js`) — patrones

- **Toggles** (`setColorMode`, `setStopColorMode`):
  ```js
  set((s) => ({ x: s.x === v ? null : v }))
  ```
- **Selectores nominales** al final del archivo (`useColorMode`, `useStopColorMode`, etc.). Evitar `useStore(s => s.x)` repartido por la app.
- Los **filtros** (`speedFilter`, `fleetFilter`, `occupancyFilter`, ...) son `[min, max]` o `null` hasta que sus datos cargan. La inicialización se hace en `useEffect` dentro de `App.jsx` cuando llega cada dataset.

## Compatibilidad móvil

**La aplicación DEBE funcionar sin problemas en teléfonos móviles en cualquier navegador, incluido Chrome en Android.**

Reglas a mantener siempre:
- El mapa (Deck.gl + MapLibre) debe renderizarse correctamente en Chrome Android. Usar `powerPreference: 'default'` en `glOptions` del componente DeckGL (NO `'high-performance'` — falla en muchos chips móviles).
- El sidebar en móvil (≤720 px) se comporta como un bottom-sheet que sube desde abajo.
- Cuando el sidebar está cerrado, el botón ☰ (`.sidebar-open-btn`) debe ser visible y accesible sobre el mapa.
- Usar `env(safe-area-inset-bottom, 0px)` en cualquier elemento fijo al borde inferior para respetar el home indicator y la barra de navegación de Android/iOS.
- `height: 100dvh` en el contenedor `.app` para adaptar la altura a la barra de URL dinámica del navegador móvil.
- No usar `backdrop-filter` en elementos que compartan compositing layer con el canvas WebGL.
- Probar siempre en móvil (o DevTools en modo responsive) antes de hacer push a producción.

## Comandos útiles

```bash
npm run dev       # Servidor de desarrollo (http://localhost:5173)
npm run build     # Build de producción a dist/
npm run preview   # Sirve el build localmente
npm run lint      # ESLint
```

## Documentación viva

- [docs/IDEACION.md](docs/IDEACION.md) — Roadmap de mejoras y features futuras (priorizado).
- [docs/CONTEXTO_PROXIMA_SESION.md](docs/CONTEXTO_PROXIMA_SESION.md) — Última sesión: qué se hizo, estado git, qué verificar.

Cuando cierres una sesión que haya cambiado el estado del proyecto, actualiza estos dos documentos antes de irte.
