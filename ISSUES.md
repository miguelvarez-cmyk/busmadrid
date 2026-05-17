# ISSUES.md — Bugs, Deuda Técnica y Preguntas Abiertas

> Triage: revisar al inicio de cada sesión · Auto-archivo tras 10 verificadas
> Ver también: [TODO.md](TODO.md) · [PROGRESS.md](PROGRESS.md)

**Tipos:** `BUG` `DEBT` `QUESTION` `LIMIT` `PERF` `FEAT`
**Estados:** 🔴 crítico → 🟡 en progreso → 🟢 verificado → ✅ archivado

---

## Abiertos

### LIMIT-DEPLOY-001 🟢
**Descripción:** IONOS Deploy Now tiene una cuota de **50 003 968 bytes (~47,7 MiB)** para el artefacto de deploy (`dist/`). A 2026-05-17 el deploy ocupa ~46,4 MB, dejando solo ~3,5 MB de margen.
**El mayor fichero es** `buildings_line_coverage.geojson` (~32 MB post-optimización). Añadir datos nuevos grandes podría volver a superar la cuota.
**Protocolo si se supera la cuota:**
1. `python scripts/optimize_buildings_geojson.py` — re-optimiza el GeoJSON sin reprocesar GTFS
2. Si no basta: simplificar geometrías más agresivamente (subir tolerancia en el script) o considerar hosting externo para ese fichero
**Estado:** 🟢 (limitación conocida, gestionada)

---

### QUESTION-GTFS-001 ✅
**Descripción:** `README.md` indicaba que los GeoJSON procesados van a `data/processed/`, pero `CLAUDE.md` y el pipeline real producen los archivos en `public/data/` (servidos estáticamente por Vite). El `README.md` estaba desactualizado.
**Acción:** `README.md` corregido el 2026-05-17 — ahora refleja `public/data/` y lista todos los scripts del pipeline.
**Estado:** ✅ resuelto 2026-05-17

---

### PERF-RENDER-001 🟡
**Descripción:** Bundle JS reportado en ~948 kB (`index-*.js`) + `maplibre-gl` ~802 kB. Supera el RNF-04 de < 2 MB combinado pero hay margen de optimización con code-splitting.
**Acción:** TODO.md #M1 — `manualChunks` en Vite + lazy imports.
**Estado:** 🟡 (pendiente implementación)

---

### PERF-RENDER-002 🟡
**Descripción:** `useMemo` de layers en `App.jsx` tiene >20 dependencias, lo que provoca invalidaciones frecuentes.
**Acción:** TODO.md #M3 — extraer `useRoutesLayer`, `useStopsLayer`.
**Estado:** 🟡 (pendiente)

---

### FEAT-UX-001 🟡
**Descripción:** Sidebar móvil (bottom-sheet) funciona pero le falta drag-handle, snap a alturas y cierre por swipe-down.
**Acción:** TODO.md #M2.
**Estado:** 🟡 (pendiente)

---

### DEBT-TESTS-001 🟡
**Descripción:** `src/utils/service.js` y `src/utils/routeGroups.js` tienen lógica densa (parseos, escalas de color, bucketing) sin ningún test unitario.
**Acción:** TODO.md #M5 — añadir Vitest.
**Estado:** 🟡 (pendiente)

---

### LIMIT-RT-001 🟢
**Descripción:** GTFS-RT (posiciones en tiempo real) requiere acceso a la API EMT con registro. Sin ese acceso, no es implementable.
**Acción:** Ninguna hasta confirmar acceso. Ver TODO.md #B1.
**Estado:** 🟢 (limitación conocida, no bloquea MVP)

---

### DEBT-A11Y-001 🟡
**Descripción:** Accesibilidad parcialmente implementada (2026-05-15). Pendiente: skip-to-content link, `aria-live` en histogramas, auditoría completa con axe-core.
**Acción:** TODO.md #B7.
**Estado:** 🟡 (pendiente)

---

## Archivados

*(Ninguno aún — los issues se archivan aquí cuando llegan a ✅)*
