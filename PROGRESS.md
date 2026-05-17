# PROGRESS.md — Continuidad entre Sesiones

> Triage: actualiza "Dónde retomar" al cerrar cada sesión
> Ver también: [TODO.md](TODO.md) · [ISSUES.md](ISSUES.md) · [CLAUDE.md](CLAUDE.md)

---

## Dónde retomar (actualiza esto al cerrar)

**Sesión cerrada:** 2026-05-17 (noche 3)
**Última tarea completada:** Rediseño UX/UI completado — dark theme, IBM Plex Sans, opacidad dinámica, filtros temporales visibles, bottom sheet móvil
**Próxima acción:** Verificar deploy IONOS → animación temporal horaria — TODO.md #A1

**Estado de verificación:**
- [x] `npm run build` pasa sin warnings — 42.8 MB (margen: 7.2 MB)
- [x] Dev server corriendo sin issues (http://localhost:5182+)
- [x] Commit `e74414a` pusheado a `main`
- ⏳ Deploy IONOS en progreso — esperar confirmación de construcción

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
