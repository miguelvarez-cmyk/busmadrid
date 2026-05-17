# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚡ Quick Status 🔒
<!-- ≤50 tokens: actualiza esto al empezar/cerrar cada sesión -->
Fase: desarrollo activo · Bloqueadores: ninguno · Próxima acción: animación temporal horaria (TODO.md #A1) · Última sesión: rediseño selector día/hora — 3 tipos semánticos + dark theme (2026-05-17)

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

**Cómo se componen las capas (`App.jsx`):**
`App.jsx` es el orquestador central. Llama a `useGTFSData()` que carga todos los JSON, calcula `occupancyData` y `visibleRouteIds` con `useMemo`, y construye el array `layers` pasándolo a `<DeckGL>`. Las capas se instancian solo en `src/layers/`, nunca dentro de componentes.

**Capas Deck.gl activas:**
- `createRoutesLayer` — líneas EMT (coloreado por `colorMode`)
- `createHighlightLayer` — línea hover resaltada
- `createStopsLayer` — paradas EMT (coloreado por `stopColorMode`)
- `createZonesLayer` — polígonos de barrios/distritos
- `createBuildingCoverageLayer` — cobertura por edificio (modo `buildingCoverageMode`)
- `createMetroCercaniasRoutesLayer` — líneas Metro (toggle independiente; Cercanías eliminada por datos de baja calidad)
- `createMetroCercaniasStopsLayer` — paradas Metro

**Modos de color de líneas (`colorMode`):**
`offer | schedule | speed | tortuosity | divergence | fleet | demand | occupancy | coverage | null`
Toggle: clic en modo activo → `null`. Cada modo tiene su filtro `[min, max]` inicializado en `App.jsx` cuando carga el dataset.

**Modos de color de paradas (`stopColorMode`):**
`routes | expeditions | null` — mismo patrón toggle.

**Sidebar: 8 secciones en acordeón (orden vinculante):**
1. Líneas — `LineSelector`
2. Barrios — botón `▭ Área` + `DistrictsPanel`
3. Calidad de la Oferta — `VisualizationControls` (3 modos: offer, schedule, speed)
4. Análisis de itinerarios — `ItinerariosPanel` (2 modos: tortuosity, divergence)
5. Paradas — checkbox + `StopRoutesPanel` + `StopExpeditionsPanel`
6. Otros — `OtrosPanel` (flota, demanda, ocupación)
7. Metro — `MetroCercaniasPanel` (solo Metro; Cercanías pendiente de datos)
8. Fondo — `LayerToggles` (basemap)

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

**⚠️ Cuota de deploy IONOS: 50 MB (~47,7 MiB)**
A 2026-05-17 el `dist/` ocupa ~46,4 MB. Margen restante: ~3,5 MB.
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

---

## 🎨 Estilo 🔓

### Restricciones (obligatorias)
- Sin TypeScript — JS puro
- Capas Deck.gl: factoría `createXxxLayer(data, options)` en `src/layers/`. No instanciar en componentes
- Estado compartido → `src/store/useMapStore.js`. Estado local → `useState`
- Selectores nominales exportados al final del store (`useColorMode`, `useViewState`…). Prohibido `useStore(s => s.x)` disperso
- Sidebar: respetar orden de las 6 secciones
- Gradiente de color universal: verde `[50,200,50]` → amarillo `[220,200,50]` → rojo `[220,50,50]`; todas las capas e histogramas
- `powerPreference: 'default'` en `glOptions` (NO `'high-performance'` — crashea en chips móviles)
- `height: 100dvh` en `.app`; `env(safe-area-inset-bottom)` en elementos fijos al borde inferior
- No usar `backdrop-filter` en capas que compartan compositing layer con el canvas WebGL
- Toggles en el store: `set((s) => ({ x: s.x === v ? null : v }))`
- Buckets de Histogram: `{ label: string, count: number, color: [r,g,b], inRange?: boolean }`

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
- Reordenar las 6 secciones del sidebar

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
