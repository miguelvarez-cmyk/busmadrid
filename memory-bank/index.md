# memory-bank/index.md — Mapa Maestro de Documentación

> Punto de entrada único para todas las sesiones. Leer esto primero.
> Última actualización: 2026-05-17

---

## Ecosistema de documentación

| Archivo | Tipo | Cuándo consultar |
|---|---|---|
| [CLAUDE.md](../CLAUDE.md) | Instrucciones para Claude | Siempre — reglas de colaboración, stack, comandos |
| [README.md](../README.md) | Usuario externo | Setup inicial, instalación |
| [SPEC.md](../SPEC.md) | Requisitos | Antes de implementar features nuevas |
| [TODO.md](../TODO.md) | Tareas activas | Al iniciar sesión — ver "Tarea Actual" |
| [ISSUES.md](../ISSUES.md) | Bugs y deuda | Al encontrar un problema o al iniciar sesión |
| [SCHEMA.md](../SCHEMA.md) | Datos | Al tocar pipeline Python o carga de datos en frontend |
| [DESIGN.md](../DESIGN.md) | Visual e interacción | Al tocar CSS, colores, componentes UI |
| [DECISIONS.md](../DECISIONS.md) | ADRs | Al considerar cambios arquitectónicos |
| [PROGRESS.md](../PROGRESS.md) | Sesiones | Al inicio de sesión — ver "Dónde retomar" |

---

## Flujo de inicio de sesión recomendado

1. Leer `PROGRESS.md` → "Dónde retomar"
2. Leer `TODO.md` → "Tarea Actual"
3. Revisar `ISSUES.md` → issues 🔴 críticos abiertos
4. Consultar el archivo específico según la tarea (SCHEMA, DESIGN, DECISIONS…)

---

## Patrones exitosos

- **Gradiente de color universal:** siempre verde→amarillo→rojo `[50,200,50]→[220,200,50]→[220,50,50]`. Definido en `DESIGN.md`. Duplicarlo fuera de `src/utils/service.js` rompe la consistencia visual.
- **Factorías de capas:** `createXxxLayer(data, options)` en `src/layers/`. Nunca instanciar capas dentro de componentes — el `useMemo` de `App.jsx` las compone.
- **Toggle de colorMode:** `set((s) => ({ x: s.x === v ? null : v }))`. Patrón usado en todos los modos de color.
- **Selectores Zustand:** exportar selectores nominales al final de `src/store/useMapStore.js`. Evita re-renders innecesarios.

---

## Aprendizajes de depuración

- **Chrome Android crashea con `powerPreference: 'high-performance'`** en chips de gama media. Siempre usar `'default'` (ADR-004).
- **`backdrop-filter` en overlays** comparte compositing layer con el canvas WebGL y causa artefactos. No usar en elementos sobre el mapa.
- **Acordeón con `max-height: 9999px`** produce cierre con delay perceptible. Usar `grid-template-rows: 0fr → 1fr` (aplicado en sesión 2026-05-15).
- **`service_metrics.json` usa `dow` como string** ("0"–"6"), no como número. Los accesos `byRoute[id]["1"]` (lunes) deben usar comillas.

---

## Dependencias externas clave

- CARTO vector tiles: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
- Nominatim geocoding: `https://nominatim.openstreetmap.org/search` (acotado a Madrid)
- Feed GTFS EMT: publicado en portal de datos abiertos del Ayuntamiento de Madrid / CRTM
