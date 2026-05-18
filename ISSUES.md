# ISSUES.md — Bugs, Deuda Técnica y Preguntas Abiertas

> Triage: revisar al inicio de cada sesión · Auto-archivo tras 10 verificadas
> Ver también: [TODO.md](TODO.md) · [PROGRESS.md](PROGRESS.md)

**Tipos:** `BUG` `DEBT` `QUESTION` `LIMIT` `PERF` `FEAT`
**Estados:** 🔴 crítico → 🟡 en progreso → 🟢 verificado → ✅ archivado

---

## Abiertos

### LIMIT-DEPLOY-001 🔴
**Descripción:** IONOS Deploy Now tiene una cuota de **50 003 968 bytes (~47,7 MiB)** para el artefacto de deploy (`dist/`). A 2026-05-18 el `dist/` ocupa **108 MB**, muy por encima de la cuota.

**Desglose de los archivos más pesados:**
| Fichero | Tamaño |
|---|---|
| `edificios_poblacion.fgb` | 34.5 MB |
| `buildings_line_coverage.geojson` | 25.0 MB (era 28.7 MB; se eliminó campo `address`) |
| `route_buffers.fgb` | 26.4 MB |
| `parking_bands.geojson` | 8.6 MB |
| `routes.geojson` | 7.3 MB |

**Hipótesis:** el deploy actual funciona o IONOS no contabiliza los `.fgb` (cargados en runtime, no en el build HTML). Hay que verificarlo.

**Opciones priorizadas para reducir tamaño (próxima sesión):**
1. Verificar qué mide exactamente IONOS (¿solo assets referenciados en `index.html`?)
2. Eliminar `address` de `buildings_line_coverage.geojson` ✅ ya hecho (-3.7 MB)
3. Simplificar `parking_bands.geojson` (8.6 MB) con tolerancia mayor en el script
4. Convertir `buildings_line_coverage.geojson` a FlatGeobuf (~60% menos)
5. Particionar `buildings_line_coverage.geojson` por distrito con carga lazy
6. Hosting externo (CDN) para los tres ficheros `.fgb` y el GeoJSON de edificios

**Protocolo urgente si el deploy falla:**
```bash
python scripts/optimize_buildings_geojson.py  # reduce GeoJSON sin reprocesar
npm run build && du -sh dist/                 # verificar antes de push
```
**Estado:** 🔴 (cuota técnicamente superada; pendiente confirmar si el deploy actual sigue funcionando)

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
