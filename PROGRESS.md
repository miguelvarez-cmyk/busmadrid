# PROGRESS.md — Continuidad entre Sesiones

> Triage: actualiza "Dónde retomar" al cerrar cada sesión
> Ver también: [TODO.md](TODO.md) · [ISSUES.md](ISSUES.md) · [CLAUDE.md](CLAUDE.md)

---

## Dónde retomar (actualiza esto al cerrar)

**Sesión cerrada:** 2026-05-19
**Última tarea completada:** Arregla panel Cobertura Poblacional — histograma visible siempre y elimina checkbox edificios residenciales
**Próxima acción:** Verificar si el deploy IONOS sigue funcionando con `dist/` de 108 MB (ver ISSUES.md LIMIT-DEPLOY-001 🔴) y atacar la cuota si falla

**Estado de verificación:**
- [x] Commit pusheado a `main`

---

## Sesión 2026-05-19 — Arreglo panel Cobertura Poblacional

### Qué se hizo

- **Histograma siempre visible**: `coverageBuckets` en `CoveragePanel.jsx` estaba condicionado a `isActive` (colorMode === 'coverage'), por lo que el histograma aparecía vacío al abrir el panel. Eliminada esa condición — el histograma se calcula y muestra siempre que haya datos, igual que el resto de paneles.
- **Eliminado checkbox "Mostrar edificios residenciales"**: eliminado de `CoveragePanel.jsx` junto con sus props `showBuildings`/`setShowBuildings`. La capa `createBuildingsLayer` (edificios verdes zoom 14+) se mantiene intacta en `App.jsx`.
- **Limpieza de props huérfanas**: eliminadas `buildingLineCoverage`, `buildingCoverageLoading`, `showBuildings` y `setShowBuildings` de la firma de `Sidebar.jsx` y del JSX de `App.jsx`; `buildingCoverageLoading` desdestructurada del hook.

### Archivos modificados
```
src/components/map/CoveragePanel.jsx   (elimina checkbox; quita isActive && del useMemo)
src/components/map/Sidebar.jsx         (elimina props huérfanas de CoveragePanel y firma)
src/App.jsx                            (elimina props huérfanas de Sidebar; limpia destructuring)
CLAUDE.md / PROGRESS.md               (actualizados)
```

---

## Sesión 2026-05-18 (noche) — Reducción buildings_line_coverage.geojson

### Qué se hizo

- **Análisis de opciones de reducción**: 8 estrategias evaluadas para reducir `buildings_line_coverage.geojson` (28.7 MB). Descartada compresión HTTP (no reduce cuota en disco). Descartada conversión a `.gz` pre-build (requiere dependencia).
- **Eliminación campo `address`** (opción 2): campo `"Edificio en 21015"` no usado en la visualización; eliminado de los 118,242 features → **28.7 MB → 25.0 MB (-13%)**.
- **Script actualizado**: `compute_building_line_coverage.py` — eliminado `address` y `osm_id` del output; `round_coords` explícito a `precision=4`.
- **Diagnóstico de cuota real**: el `dist/` completo pesa 108 MB (cuota 50 MB). Los archivos `.fgb` (`edificios_poblacion.fgb` 34.5 MB, `route_buffers.fgb` 26.4 MB) son los mayores contribuyentes. Pendiente verificar si IONOS los contabiliza. Ver ISSUES.md LIMIT-DEPLOY-001 🔴.

### Archivos modificados
```
public/data/buildings_line_coverage.geojson   (campo address eliminado; 28.7→25.0 MB)
scripts/compute_building_line_coverage.py      (elimina address/osm_id del export; precision=4)
ISSUES.md                                      (LIMIT-DEPLOY-001 actualizado a 🔴 con desglose)
```

---

## Sesión 2026-05-18 (tarde) — Filtro edificios por líneas seleccionadas

### Qué se hizo

- **Filtro `buildingCoverageMode` por `selectedRouteIds`**: al activar "Mostrar edificios residenciales", la capa ahora solo muestra los edificios cubiertos por las líneas que el usuario tiene seleccionadas en ese momento. Si se deseleccionan líneas, los edificios de esas líneas desaparecen; si no hay ninguna seleccionada, la capa queda vacía.
- **Implementación**: nuevo `useMemo` (`filteredBuildingCoverage`) en `App.jsx` que filtra `buildingLineCoverage.features` comprobando que el campo `lineas` (CSV, e.g. `"101,200,N27"`) incluya al menos un id presente en `selectedRouteIds`. Se pasa el GeoJSON filtrado a `createBuildingCoverageLayer`, que recalcula `maxLineas`/`maxPop` automáticamente sobre el subset.

### Archivos modificados
```
src/App.jsx   (+useMemo filteredBuildingCoverage; pasa filteredBuildingCoverage a la capa)
TODO.md       (añade entrada completada)
PROGRESS.md   (esta entrada)
```

---

## Sesión 2026-05-18 — Merge feature/coverage-poblacional + corrección edificios

### Qué se hizo

- **Merge de `feature/coverage-poblacional` en `main`**: integración manual de 10 conflictos resolviendo la convivencia entre el trabajo local (cobertura poblacional, edificios, elementos viales) y los 32 commits nuevos de `main` (dark theme, metro/cercanías, itinerarios, pantalla de carga, etc.).
- **Cobertura poblacional**: `CoveragePanel` con slider de distancia (50–800 m), histograma de buckets fijos (`< 1k … > 500k`), coloración de líneas por `coverageColorForRoute` usando `min_N`/`max_N` del JSON (nuevo modelo de datos).
- **Capa de edificios residenciales**: hook `useBuildingsData` carga FlatGeobuf por viewport (debounced 400 ms) y filtra por buffers de ruta cuando están disponibles. Corregidos dos bugs post-merge: `MIN_ZOOM` bajado de 12 → 11 (zoom inicial del mapa) y `applyFilter` devuelve `raw` en lugar de `[]` cuando los buffers aún están cargando.
- **Elementos viales**: carriles bus exclusivos (naranja) + bandas aparcamiento SER (colores por zona), con toggles en sección "Elementos Viales" del sidebar.
- **Corrección lint post-merge**: eliminados props duplicados (`routeCoverage` en `RouteDrawer` y `App`), `coverage300` duplicado en `RouteDrawer`, y directivas `eslint-disable` mal posicionadas.

### Archivos clave modificados/añadidos
```
src/utils/useBuildingsData.js          (MIN_ZOOM 12→11, applyFilter devuelve raw)
src/utils/useRouteBuffers.js           (nuevo)
src/utils/pointInPolygon.js            (nuevo)
src/layers/createBuildingsLayer.js     (nuevo)
src/layers/createBusLanesLayer.js      (nuevo)
src/layers/createParkingBandsLayer.js  (nuevo)
src/components/map/CoveragePanel.jsx   (versión feature: concepto simplificado)
src/components/map/ElementosVialesPanel.jsx (nuevo)
src/utils/service.js                   (coverage functions: min_N/max_N + COVERAGE_BUCKETS)
src/store/useMapStore.js               (showBuildings, showBusLanes, showParkingBands)
src/utils/useGTFSData.js               (+bus_lanes, parking_bands, metro_cercanias)
scripts/adapt_coverage.py, compute_elementos_viales.py, descargar_*, generate_*  (nuevos)
```

### Commits
```
7aa9cca corrige applyFilter: devuelve array vacío si no hay buffers de cobertura
8e9d0e8 fusiona feature/coverage-poblacional: cobertura poblacional, edificios y elementos viales
(este push) corrección MIN_ZOOM y applyFilter para visualización de edificios
```

---

## Sesión 2026-05-17 (noche 6) — Afinar divergencia + eliminar SearchBar

### Qué se hizo

- **Eliminación SearchBar**: eliminado el componente `SearchBar` (buscador de paradas/dirección flotante) de `App.jsx` — import y JSX. El archivo `SearchBar.jsx` queda en disco.
- **Divergencia: buffer híbrido + comprobación antiparalela**: el algoritmo de `compute_divergence.py` confundía "carriles opuestos de una avenida ancha" (Castellana) con "calles distintas" porque el buffer fijo de 15 m no alcanzaba a cubrir la separación entre vías de servicio (~60–80 m). Solución:
  - `BUFFER_TIGHT = 15 m` (conservado): mismo carril.
  - `BUFFER_WIDE = 80 m` + check antiparalelo (|diff_bearing − 180°| < 35°): avenida dividida → compartida.
  - Muestreo cada 20 m con `_local_bearing()` vía `atan2`.
  - Línea 027 (Castellana): 45,8 % → **15,3 %** ✓
  - Línea 045 (Castellana): 58,6 % → **34,0 %** (divergencia legítima en terminales) ✓
  - Líneas sin avenidas anchas (002, 051, 061): sin cambio ✓
- **`route_divergence.json` regenerado**: mismo esquema, nuevos valores, rango 3,1–99,5 %.

### Archivos modificados
```
scripts/compute_divergence.py          (nueva lógica: _local_bearing + buffer híbrido)
public/data/route_divergence.json      (regenerado)
src/App.jsx                            (elimina import + JSX de SearchBar)
SCHEMA.md                              (actualiza descripción del buffer)
```

### Commits
```
(este push)
```

---

## Sesión 2026-05-17 (noche 5) — Rediseño panel Barrios + eliminación filtros temporales header

### Qué se hizo

- **Panel Barrios — dark theme**: reemplazados todos los colores hardcoded de tema claro (`#f9fafb`, `#374151`, `#1a1a1a`…) por variables CSS del design system (`--text-primary`, `--text-secondary`, `--bg-surface-3`, `--accent-dim`…). Los nombres de distrito ahora son legibles sobre fondo oscuro.
- **Panel Barrios — UX separación de acciones**: el botón de distrito se dividió en dos controles:
  - `.district-name-btn` (nombre + contador) → solo ilumina zona en el mapa (`toggleZoneHighlight`)
  - `.district-expand-btn` (flecha ▾) → solo expande/colapsa la lista de barrios
  - Checkbox → selección de rutas (sin cambios)
- **Eliminación panel temporal del header**: el bloque `.temporal-filters` (DÍA/HORA) que aparecía en la cabecera del sidebar se ha eliminado. El estado `timeFilter` sigue activo en el store (lo usa `VisualizationControls` y las capas).
- **CSS limpieza**: eliminados ~100 líneas de estilos huérfanos (`.temporal-filters`, `.tf-*`, `.dow-pill`) de `index.css`.

### Archivos modificados
```
src/components/map/DistrictsPanel.jsx   (separación expand/highlight, nuevas clases)
src/components/map/Sidebar.jsx          (elimina bloque temporal-filters + imports)
src/index.css                           (dark theme barrios + eliminación estilos TF)
```

### Commits
```
(este push)
```

---

## Sesión 2026-05-17 (noche 4) — Rediseño selector día/hora (panel Frecuencia)

### Qué se hizo

- **Análisis de datos**: confirmado que lunes–viernes son idénticos en `service_metrics.json` (10/10 rutas); sábado y domingo sí difieren → 3 tipos son suficientes
- **Simplificación**: 7 botones de día reemplazados por 3 semánticos: **Laborable** (dow=0), **Sábado** (dow=5), **Domingo** (dow=6)
- **Control de horas**: `<input type="number">` feos sustituidos por pares −/+ con valor formateado (`07:00`)
- **Dark theme**: toda la sección `.viz-controls .days` y `.hour-input` migrada a variables CSS del design system (`--bg-surface-2`, `--border-normal`, `--accent-dim`, etc.)
- Sin cambios en store ni en `service.js` — compatible hacia atrás

### Archivos modificados
```
src/components/map/VisualizationControls.jsx   (DAY_NAMES→DAY_TYPES, JSX días y horas)
src/index.css                                  (CSS dark theme para días y hora-control)
```

### Commits
```
(este push)
```

---

## Sesión 2026-05-17 (noche 3) — Rediseño UX/UI: Dark theme + IBM Plex Sans + Opacidad dinámica

### Qué se hizo

**8 tareas completadas en paralelo:**

1. **T1 — Design tokens**: 60+ variables CSS
   - Tipografía: `--font-primary` (IBM Plex Sans), escala --text-xs a --text-xl, pesos 400-700
   - Espaciado: base 4px (--sp-1 a --sp-12)
   - Colores oscuros: --bg-app, --bg-panel, --bg-surface, --bg-surface-2/3
   - Bordes: --border-subtle, --border-normal, --border-strong
   - Texto: --text-primary, --text-secondary, --text-tertiary, --text-disabled
   - Sombras: --shadow-sm/md/lg/float
   - Animaciones: --dur-fast/normal/slow/sheet, --ease-out/spring

2. **T2 — Tipografía IBM Plex Sans**
   - `index.html`: cambio Google Fonts Inter → IBM Plex Sans
   - `src/index.css`: `font-family: var(--font-primary)`
   - Aplicado globalmente a body, inputs, botones, labels

3. **T3 — Opacidad dinámica de líneas Deck.gl**
   - `src/layers/createRoutesLayer.js`: función `getAlpha()` y `getWidth()` condicionadas
   - Estados: neutro 0.35 → hover 0.85 → seleccionada 1.0 → inactiva 0.1
   - Ancho: 2.0px → 3.5px → 4.0px
   - `src/App.jsx`: importar `useClickedRouteId`, pasar `hoveredRouteIds` y `clickedRouteId` a createRoutesLayer

4. **T4 — Tooltip rediseño**
   - Dark theme: `--bg-surface`, `--border-normal`, `--shadow-float`
   - Botón ×: cierra tooltip llamando `setClickedRouteId(null)` + `setHoveredRouteIds([])`
   - Botones ← →: reemplazan "TAB para ciclar", navegación explícita entre líneas superpuestas
   - Animación entrada: `@keyframes tooltip-in` (0.22s, fade + scale 0.97→1)
   - Pills clickeables para saltar directo a línea

5. **T5 — Panel lateral dark theme**
   - `.sidebar`: `--bg-panel`, `--border-subtle`
   - `.accordion-header`: uppercase, `--text-secondary`, `--accent` cuando open
   - `.group-toggle`: headers de grupo con letter-spacing
   - Botones y inputs: `--bg-surface-2` → hover `--bg-surface-3`
   - Lista de líneas: hover en `--bg-surface-2` (antes amarillo)

6. **T6 — Filtros temporales en header**
   - Banda `.temporal-filters` justo bajo header sidebar
   - 7 botones día (L M X J V S D) con estado activo azul
   - Rango horario visible + botones ± para ajuste
   - Conectado a store: `setDayOfWeek()`, `setHourRange()`
   - Sincroniza con URL: ?dow=X&sh=Y&eh=Z

7. **T7 — Accesibilidad**
   - Global `:focus-visible` con `--accent` (2D8EFF), outline 2px + offset
   - Desactiva outline en `:focus:not(:focus-visible)`
   - Min-height/width 28px+ en: .dow-pill, .line-nav-btn, .tf-hour-btn, .group-actions button
   - `aria-label` mejorados: "Abrir panel de líneas", "Cerrar información", "Línea anterior/siguiente"

8. **T8 — Bottom sheet móvil**
   - `.sheet-handle`: barra 36×4px, cursor grab, toque drag
   - Eventos touchstart/move/end en `Sidebar.jsx`: drag dinámico, redraw sin transición
   - Snap points: 80px (colapsado) → 45vh (default) → 85vh (expandido)
   - Botón "abrir panel": esquina inferior derecha, icono hamburguesa
   - Safe area insets respetados

### Archivos modificados
```
src/index.css                              (+280 líneas de estilos y tokens)
src/components/map/Sidebar.jsx             (+50 líneas: drag logic, temporal filters)
index.html                                 (cambio: Inter → IBM Plex Sans)
src/App.jsx                                (cambio: useClickedRouteId, pass hoveredRouteIds/clickedRouteId)
src/layers/createRoutesLayer.js            (cambio: opacidad/ancho dinámicos)
src/components/map/RouteTooltip.jsx        (cambio: dark theme, botón ×, botones ← →)
```

### Build & Deploy
- **Build**: `npm run build` → 0 errores, 0 warnings
- **Tamaño dist**: 42.8 MB (cuota IONOS: 50 MB, margen: 7.2 MB)
- **Dev server**: http://localhost:5182+ (corriendo sin issues)
- **Git**: Commit `e74414a` pusheado a `main`
- **IONOS Deploy Now**: Esperando construcción automática

### Commits
```
e74414a rediseño UX/UI oscuro con IBM Plex Sans, opacidad dinámica y filtros temporales
```

---

## Sesión 2026-05-17 (noche 2) — Fix deploy IONOS cuota 50 MB

### Qué se hizo
- **Diagnóstico:** deploy fallaba con "deployment is larger (58 MB) than the allowed quota (50 MB)"
- **Causa raíz:** `buildings_line_coverage.geojson` ocupaba 41 MB
- **Fix aplicado** (sin re-procesar datos GTFS):
  - Nuevo script `scripts/optimize_buildings_geojson.py` (post-proceso sobre el GeoJSON existente)
  - Eliminado campo `osm_id` (no usado en frontend)
  - Precisión de coordenadas reducida 5 → 4 decimales (~11 m, suficiente para edificios)
  - Campo `lineas` convertido de JSON array string a CSV string (`["001","002"]` → `"001,002"`)
  - `CoveragePanel.jsx`: cambia `JSON.parse(building.lineas)` a `building.lineas.split(',')`
- **Resultado:** 41 MB → 32 MB; deploy total 46,4 MB < 50 MB cuota ✓

### Commits
```
6a9c69d reduce buildings_line_coverage.geojson de 41 MB a 32 MB para entrar en cuota IONOS
```

---

## Sesión 2026-05-17 (noche) — Análisis de itinerarios

### Qué se hizo
- Extraída "Tortuosidad" del acordeón "Calidad de la Oferta" a un nuevo acordeón "Análisis de itinerarios"
- Nuevo componente `ItinerariosPanel.jsx` con soporte para múltiples modos de análisis
- Nuevo análisis: **Divergencia ida/vuelta** — % del trayecto combinado que no comparte vial
  - Script Python `compute_divergence.py`: proyección UTM 30N, buffer 15 m, shapely/geopandas
  - 235 líneas calculadas, rango 3.9–99.7%
  - colorMode `divergence`, 7 categorías verde→rojo, histograma + slider 0–100%
  - Integrado en store, service.js, createRoutesLayer, App.jsx, ColorLegend

### Commit
```
(ver git log)
```

---

## Sesión 2026-05-17 (tarde) — Tooltip mejorado

### Qué se hizo
- Tooltip activado por proximidad: reemplaza `pickObjects` por cálculo de distancia punto-segmento en metros sobre el GeoJSON (`ptSegDistM` + `nearbyRouteIds` en `App.jsx`)
- Radio fijo de 150 m en espacio geográfico — funciona en cualquier punto del mapa
- Línea resaltada con color azul claro `[100,180,255]` en vez del color propio de la ruta
- Enter sobre el tooltip: abre `RouteDrawer` con detalles de la línea activa y cierra tooltip
- Tab cicla con 1 sola candidata (condición `length === 0` en lugar de `<= 1`)
- Restaurado `.eslintrc.cjs` (perdido) y corregidos 8 errores pre-existentes: hooks condicionales en `RouteTooltip`, imports huérfanos en 5 componentes, variable sin usar en `createStopsLayer`

### Commit
```
b3d074d mejora tooltip: detección por radio 150 m, resalte azul y Enter→drawer
```

---

## Sesión 2026-05-17 — Ecosistema de documentación

### Qué se hizo
- Auditoría de 4 archivos `.md` existentes
- Eliminados: `docs/CONTEXTO_PROXIMA_SESION.md`, `docs/IDEACION.md`
- Reescrito: `CLAUDE.md` con esquema de 8 secciones (Quick Status, Arquitectura, Comandos, Estilo, Lista de Nunca, Etiqueta, Disparadores, Índice)
- Creados: `SPEC.md`, `TODO.md`, `ISSUES.md`, `SCHEMA.md`, `DESIGN.md`, `DECISIONS.md`, `PROGRESS.md`, `memory-bank/index.md`

### Discrepancias detectadas (registradas en ISSUES.md)
- `QUESTION-GTFS-001`: `README.md` dice `data/processed/` pero el pipeline real genera en `public/data/`

### Comandos CLI ejecutados
```
find . -name "*.md" -not -path "*/node_modules/*"   # auditoría
rm docs/CONTEXTO_PROXIMA_SESION.md                  # ✅ eliminado
rm docs/IDEACION.md                                 # ✅ eliminado
```

---

## Sesión 2026-05-15 — Refactor UI/UX

### Qué se hizo
50 correcciones organizadas en 5 grupos (C1–C8 CSS críticos, C9–C12 JSX, I1–I9 importantes, M2–M7 menores, N1–N5 nice-to-have). Ver historial git para detalle.

### Commits de la sesión
```
cf725ed añade indicador de carga y botón de reset en el sidebar (N1, N5)
5f80fab añade mejoras de producto nice to have (grupo 5)
ed23c4b corrige detalles de CSS menores (grupo 4)
3c5157d añade tokens CSS y mejoras visuales importantes (grupo 3)
402fc7d refactoriza UI/UX: CSS críticos y JSX críticos (grupos 1 y 2)
```

### Checklist de verificación (de la sesión anterior)
- [x] `npm run dev` → Chrome desktop: sidebar abre/cierra con animación fluida
- [x] Clic en título "Visualizador Bus Madrid" → mapa regresa al centro y reactiva líneas
- [x] Atajo `[` → abre y cierra el sidebar sin afectar inputs de texto
- [x] DevTools a 375px: sidebar como bottom-sheet
- [x] Acordeón: "Líneas" abierta por defecto al cargar
- [x] Navegación por teclado: `:focus-visible` visible
- [x] Sección "Otros" siempre visible aunque falten datasets
- [x] SearchBar: mensaje "Sin resultados para…" funciona

---

## Sesión 2026-05-13 — Features de interacción

### Qué se hizo
- Búsqueda por dirección/parada (Nominatim + búsqueda local)
- Estado compartible vía URL (`useUrlSync`)
- Detalle de línea — drawer lateral con gráfico 24h
- Leyenda persistente de color (`ColorLegend`)

---

## Sesión 2026-05-12 — Tooltip enriquecido

### Qué se hizo
- Tooltip muestra nº, nombre, longitud, horario, velocidad y demanda
- Detección de líneas superpuestas con ciclo Tab / Shift+Tab
