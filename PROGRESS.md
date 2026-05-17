# PROGRESS.md — Continuidad entre Sesiones

> Triage: actualiza "Dónde retomar" al cerrar cada sesión
> Ver también: [TODO.md](TODO.md) · [ISSUES.md](ISSUES.md) · [CLAUDE.md](CLAUDE.md)

---

## Dónde retomar (actualiza esto al cerrar)

**Sesión cerrada:** 2026-05-17
**Última tarea completada:** Nuevo apartado "Análisis de itinerarios" con Tortuosidad + Divergencia ida/vuelta
**Próxima acción:** Animación temporal horaria — TODO.md #A1

**Estado de verificación pendiente:**
- [x] `npm run lint` pasa sin warnings
- [ ] Verificar deploy IONOS en producción tras el push de esta sesión

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
