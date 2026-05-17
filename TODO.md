# TODO.md — Cola de Tareas

> Triage: actualiza "Tarea Actual" al iniciar/cerrar cada sesión
> Ver también: [ISSUES.md](ISSUES.md) · [PROGRESS.md](PROGRESS.md) · [SPEC.md](SPEC.md)

---

## Tarea Actual (≤3 ítems activos)

| ID | Tarea | Estado |
|---|---|---|
| A1 | Animación temporal horaria — slider/play sobre rango horario que anima `colorMode='offer'` con `currentHour` | 🟡 pendiente |

---

## Cola Alta Prioridad

| ID | Tarea | Complejidad | Fuente |
|---|---|---|---|
| A1 | **Animación temporal horaria** — slider de hora + botón play/pause; usa `serviceMetrics` hora-a-hora ya disponible; actualiza `colorMode='offer'` con `currentHour` en el store | M | IDEACION 2.1 |
| A2 | **Métricas agregadas por barrio** — al pinchar un barrio: líneas servidas, paradas en su interior, frecuencia media combinada en hora punta, cobertura % superficie < 300 m de parada | M | IDEACION 1.2 |
| A3 | **Comparativa entre líneas seleccionadas** — panel agregado con frecuencia, velocidad, ocupación, paradas comunes, solapamiento % cuando hay ≥2 líneas activas | M | IDEACION 1.1 |

---

## Cola Media Prioridad

| ID | Tarea | Complejidad | Fuente |
|---|---|---|---|
| M1 | **Code-splitting** — `manualChunks` en Vite + `lazy import` para `DistrictsPanel`, `OtrosPanel`; reducir bundle de ~948 kB | S | IDEACION 5.1 |
| M2 | **Pulir sidebar móvil** — drag-handle visible, snap a 25%/50%/90%, cierre por swipe-down | S | IDEACION 6.5 |
| M3 | **Memoización en App.jsx** — extraer `useRoutesLayer`, `useStopsLayer`; reducir las >20 dependencias del `useMemo` de layers | S | IDEACION 5.3 |
| M4 | **Heatmap de demanda** — capa `@deck.gl/aggregation-layers` de viajeros/día por parada | M | IDEACION 1.3 |
| M5 | **Tests unitarios de utilidades** — Vitest sobre `src/utils/service.js` y `src/utils/routeGroups.js` | M | IDEACION 8.1 |
| M6 | **Comparativa día-a-día** — overlay Lab vs Sáb vs Festivo para frecuencia de una línea | S | IDEACION 2.2 |
| M7 | **Detección de huecos de servicio** — resaltar tramos horarios con intervalo > 30 min | M | IDEACION 2.3 |
| M8 | **Modo claro real** — añadir CARTO Positron; basemaps: `light`=Positron, `dark`=Dark Matter, `osm`=OSM, `satellite`=Esri | S | IDEACION 6.4 |
| M9 | **`compute_coverage.py`** — buffer 300 m por parada clipado por barrio → `stop_coverage.geojson` | M | IDEACION 7.1 |
| M10 | **`compute_transfers.py`** — pares de paradas < 100 m con líneas distintas → `transfer_edges.geojson` | M | IDEACION 7.2 |

---

## Pendiente de Datos

| ID | Tarea | Motivo de bloqueo |
|---|---|---|
| D1 | **Visualización de Cercanías** — capas de líneas y paradas de Cercanías Renfe en el mapa (toggles en sección Metro) | Datos actuales de calidad insuficiente; requiere fuente GTFS fiable de CRTM/Renfe |

---

## Cola Baja Prioridad

| ID | Tarea | Complejidad | Fuente |
|---|---|---|---|
| B1 | **Posiciones GTFS-RT** — buses como puntos animados con `IconLayer`; requiere acceso API EMT | L | IDEACION 4.1 |
| B2 | **Análisis de transbordos/hubs** — grafo parada-línea con nodos de conexión | L | IDEACION 1.4 |
| B3 | **Selección por trazado libre** — polígono dibujado para seleccionar líneas/paradas | L | IDEACION 3.4 |
| B4 | **Tile vectorial propio** — `routes.geojson` como MVT via tippecanoe | L | IDEACION 5.2 |
| B5 | **Web Workers para cómputos pesados** — mover `applyModeFilter`, histogramas a worker | M | IDEACION 5.4 |
| B6 | **`@ts-check` + JSDoc** — chequeo gradual sin migrar a TypeScript | M | IDEACION 8.2 |
| B7 | **Accesibilidad pendiente** — skip-to-content link, `aria-live` en histogramas, auditoría axe-core | S | IDEACION 6.6 |
| B8 | **Estado vacío informativo** — atajos cuando no hay líneas: "Ver nocturnas", "Mostrar Centro" | S | IDEACION 6.3 |
| B9 | **Demanda por hora** — si EMT publica viajeros por franja, derivar ocupación hora-a-hora | L | IDEACION 7.3 |
| B10 | **Storybook** — iterar visualmente sobre paneles sin levantar el mapa | M | IDEACION 8.3 |
| B11 | **Matriz O-D** — arcos curvos entre centroides de barrios si EMT publica O-D | XL | IDEACION 1.5 |

---

## Completadas

| ID | Tarea | Completado |
|---|---|---|
| ✅ | **Rediseño UX/UI**: Dark theme + IBM Plex Sans + Opacidad dinámica + Filtros temporales visibles + Bottom sheet móvil | 2026-05-17 |
| ✅ | Análisis de itinerarios: Tortuosidad + Divergencia ida/vuelta | 2026-05-17 |
| ✅ | Tortuosidad extraída de Calidad de la Oferta a nuevo acordeón | 2026-05-17 |
| ✅ | Tooltip: radio 150 m, resalte azul, Enter → drawer | 2026-05-17 |
| ✅ | Tooltip enriquecido con detección de líneas superpuestas | 2026-05-12 |
| ✅ | Búsqueda por dirección/parada (Nominatim + local) | 2026-05-13 |
| ✅ | Estado compartible vía URL (`useUrlSync`) | 2026-05-13 |
| ✅ | Detalle de línea — drawer lateral con gráfico 24h | 2026-05-13 |
| ✅ | Leyenda persistente de color (`ColorLegend`) | 2026-05-13 |
| ✅ | Refactor UI/UX completo — 50 correcciones (tokens CSS, lazy accordion, focus-visible, etc.) | 2026-05-15 |
| ✅ | Indicador de carga y botón de reset en sidebar | 2026-05-15 |
