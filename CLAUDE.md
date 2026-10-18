# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚡ Quick Status 🔒
<!-- ≤50 tokens: actualiza esto al empezar/cerrar cada sesión -->
Fase: desarrollo activo · Bloqueadores: ninguno · Próxima acción: ficha de barrio (territorio) · Última sesión: rediseño UX completo — barra superior, tabla ranking, ficha/comparación, CSV, metodología (2026-10-18)

---

## 🏗️ Arquitectura 🔒

Visualizador interactivo del feed **GTFS de la EMT de Madrid** con capas de Metro y Cercanías. Renderiza paradas y recorridos sobre mapa con filtros por línea, modo y franja horaria.

**Flujo de datos:**
`data/raw/GTFS/*.txt` → scripts Python → `public/data/*.geojson|*.json` → `useGTFSData()` → capas Deck.gl

**Stack fijo:**
- React 18 + Vite 5 (ES modules, sin TypeScript)
- Deck.gl 9 sobre MapLibre GL JS vía `react-map-gl/maplibre`
- Zustand 4 — store único en `src/store/useMapStore.js`
- CARTO Dark Matter como basemap por defecto
- Python 3.10+ (pandas, geopandas, shapely) para pipeline GTFS

**Cómo se compone la app (`App.jsx`):**
`App.jsx` es el orquestador central. `useGTFSData()` carga todos los JSON en un objeto `data`; `computeIndicators()` (en `src/utils/indicators.js`) calcula los 12 indicadores de todas las líneas para el contexto activo, y `passing` = líneas del ámbito que cumplen los filtros. Todo se comparte por `NetworkContext` (`src/utils/network.js`). Las capas se instancian solo en `src/layers/`, nunca dentro de componentes.

**Registro de indicadores (`src/utils/indicators.js`) — fuente única:**
Mapa, tabla, ficha, CSV y metodología salen de `INDICATORS`. Añadir un indicador = añadir una entrada (id, grupo, etiqueta, unidad, `deps`, semántica de color, `def`, `method`, `value()`).
Grupos: Oferta (intervalo, expediciones/día, amplitud, flota) · Demanda (viajeros/día, Δ interanual, viajeros/expedición) · Rendimiento (velocidad) · Trazado (longitud, tortuosidad, divergencia) · Territorio (población servida).

**Estado (`useMapStore`):** `indicator` (null = red neutra) · contexto global `dayType`/`startHour`/`endHour`/`year`/`radius` · `filters` combinados `{ [indId]: [min|null, max|null] }` · `selectedRouteIds` (ámbito "Líneas") · `clickedRouteId` + `pinnedRouteIds` (ficha/comparación) · columnas y orden de la tabla.

**Capas Deck.gl activas:**
- `createRoutesLayer` — líneas: las que no pasan ámbito/filtros, atenuadas en gris debajo; las de la ficha, encima y más gruesas
- `createStopsLayer` — paradas (opcional), coloreables por nº de líneas o expediciones

**Estructura de pantalla (vinculante, ver `docs/REDISENO_UX.md`):**
1. Barra superior — indicador · tipo de día · franja · año · filtro Líneas · chips de filtros · Metodología
2. Mapa — leyenda + histograma con filtro (abajo izq.) · control de capas (arriba dcha.) · tooltip
3. Panel derecho — tabla ranking ↔ ficha de línea / comparación (sustituye a la tabla)
4. Metodología — capa a pantalla completa en `#metodologia`

---

## ⌨️ Comandos 🔒

```bash
npm run dev       # servidor de desarrollo http://localhost:5173
npm run build     # build de producción → dist/
npm run preview   # sirve el build localmente
npm run lint      # ESLint (máx 0 warnings)
```

**Deploy a producción:**
El proyecto usa **IONOS Deploy Now** conectado al repo de GitHub.
Basta con hacer push a `main` — el deploy se dispara automáticamente.
No hay script de deploy manual ni rama `gh-pages`.
```bash
git push origin main   # → IONOS construye y publica automáticamente
```

**⚠️ Identidad git:** los commits deben ir firmados como `miguelvarez-cmyk`
(`miguelvarez@gmail.com`). La identidad global de este equipo es la del
trabajo (`Malvartinez`); con ella el workflow "Deploy to IONOS" queda en
`action_required` y no publica. Ver ISSUES.md BUG-DEPLOY-002.

**Antes de trabajar:** `git fetch` y comparar con `origin/main` — el repo se
edita desde otras máquinas y la copia local puede ir por detrás.

**Comprobar el deploy:** el bundle publicado se ve en `https://busmadrid.org/`
(`assets/index-*.js`); el estado de los workflows se consulta sin autenticación en
`https://api.github.com/repos/miguelvarez-cmyk/busmadrid/actions/runs`.

**⚠️ Cuota de deploy IONOS: 50 MB (~47,7 MiB)**
Tras el rediseño (2026-10-18) el `dist/` ocupa ~11 MB.
Si el deploy falla con "deployment is larger than the allowed quota":
```bash
python scripts/optimize_buildings_geojson.py  # reduce buildings GeoJSON sin reprocesar datos
npm run build                                 # verificar tamaño antes del push
```

Pipeline Python (en orden):
```bash
python scripts/process_gtfs.py
python scripts/compute_service.py
python scripts/compute_stop_expeditions.py
# adicionales: compute_speed.py, compute_demand.py, compute_fleet.py, compute_tortuosity.py, compute_schedule.py
```

Pipeline Metro/Cercanías — capa retirada del front en el rediseño; sus datos están en `data/archivo/` (el GTFS del CRTM omite L3; hay que parchear antes de procesar):
```bash
python scripts/download_gtfs_crtm.py         # descarga GTFS Metro + Cercanías
python scripts/fetch_metro_l3_osm.py         # inyecta geometría y paradas de L3 desde OSM
python scripts/process_metro_cercanias.py    # genera metro_cercanias_routes/stops.geojson
```

---

## 🎨 Estilo 🔓

### Restricciones (obligatorias)
- Sin TypeScript — JS puro
- Capas Deck.gl: factoría `createXxxLayer(data, options)` en `src/layers/`. No instanciar en componentes
- Estado compartido → `src/store/useMapStore.js`. Estado local → `useState`
- Selectores nominales exportados al final del store (`useColorMode`, `useViewState`…). Prohibido `useStore(s => s.x)` disperso
- Estructura de pantalla: respetar la de `docs/REDISENO_UX.md` (barra superior + mapa + panel tabla/ficha)
- Color por indicador según su semántica (`color` en el registro): valorativo verde `[50,200,50]` → amarillo `[220,200,50]` → rojo `[220,50,50]`; neutro de un solo tono azul; divergente rojo–gris–verde. Nunca colores fuera de `colorAt()`
- `powerPreference: 'default'` en `glOptions` (NO `'high-performance'` — crashea en chips móviles)
- `height: 100dvh` en `.app`; `env(safe-area-inset-bottom)` en elementos fijos al borde inferior
- No usar `backdrop-filter` en capas que compartan compositing layer con el canvas WebGL
- Toggles en el store: `set((s) => ({ x: s.x === v ? null : v }))`

### Convenciones (preferencias)
- `PascalCase` para componentes; `camelCase` para utilidades y hooks (`useXxx`)
- Sin comentarios decorativos; solo comentar el *porqué* no obvio
- Memoizar capas con `useMemo` cuando dependan de filtros del store
- Commits en castellano, imperativo: *"añade capa de paradas"*

---

## 🚫 Lista de Nunca 🔒

- No refactorizar código no solicitado
- No instalar dependencias sin confirmar con el usuario
- No crear archivos `.ts`/`.tsx`
- No commitear `data/raw/`, `node_modules/`, `.env`, ni GeoJSON > 50 MB
- No modificar secciones 🔒 sin permiso humano explícito
- No inventar comandos — extraerlos siempre del `package.json`

---

## 📌 Etiqueta de Repo 🔒

- Rama principal: `main`
- Commits en castellano, imperativo: *"añade X"*, *"corrige Y"*
- No forzar push a `main`

---

## ❓ Disparadores de Entrevista 🔒

Usar `AskUserQuestion` antes de:
- Cambios en la arquitectura de capas Deck.gl o el store Zustand
- Añadir dependencias al `package.json`
- Modificar entradas/salidas de scripts Python
- Cambiar el esquema de cualquier archivo en `public/data/`
- Cambiar la estructura de pantalla o el catálogo de indicadores

---

## 📚 Índice de Documentación 🔓

| Archivo | Contenido |
|---|---|
| [SPEC.md](SPEC.md) | Requisitos, historias de usuario, glosario GTFS, NO-construir |
| [TODO.md](TODO.md) | Cola priorizada (Alta/Media/Baja) + Tarea Actual |
| [ISSUES.md](ISSUES.md) | Bugs, deuda técnica, preguntas abiertas |
| [SCHEMA.md](SCHEMA.md) | Modelo de datos GTFS y GeoJSON de salida |
| [DESIGN.md](DESIGN.md) | Paleta, tokens CSS, estados de interacción |
| [DECISIONS.md](DECISIONS.md) | ADRs con irreversibilidad 🟢🟡🔴 |
| [PROGRESS.md](PROGRESS.md) | Estado de sesión, "dónde retomar", log CLI |
| [memory-bank/index.md](memory-bank/index.md) | Mapa maestro + patrones exitosos + aprendizajes |
