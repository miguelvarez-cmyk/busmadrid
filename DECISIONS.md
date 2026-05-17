# DECISIONS.md — Registro de Decisiones Arquitectónicas (ADRs)

> Triage: decisiones tomadas · 🔴 Rojo = no revertir sin permiso humano explícito
> Ver también: [CLAUDE.md](CLAUDE.md) · [DESIGN.md](DESIGN.md)

**Irreversibilidad:** 🟢 Verde (fácil de cambiar) · 🟡 Amarillo (costoso) · 🔴 Rojo (no revertir sin permiso)

---

## ADR-001 — Deck.gl como motor de visualización 🔴

**Fecha:** inicio del proyecto
**Estado:** activo

**Decisión:** Usar Deck.gl 9 sobre MapLibre GL JS en lugar de Leaflet + plugins de capas.

**Contexto:** El visualizador debe renderizar simultáneamente miles de segmentos de ruta y cientos de paradas con coloreado dinámico. Leaflet no escala bien a ese volumen sin plugins complejos.

**Consecuencias:**
- Arquitectura de capas en factorías `createXxxLayer()` en `src/layers/`
- `glOptions: { powerPreference: 'default' }` obligatorio (ver ADR-004)
- No usar `backdrop-filter` en overlays que compartan compositing layer con el canvas WebGL

---

## ADR-002 — Datos estáticos en `public/data/` sin backend 🔴

**Fecha:** inicio del proyecto
**Estado:** activo

**Decisión:** Los GeoJSON y JSON procesados se sirven como archivos estáticos desde `public/data/` vía Vite, sin API REST ni servidor de datos.

**Contexto:** El feed GTFS es estático (se actualiza cuando la EMT publica un nuevo feed). No justifica un backend. Los datos procesados se generan localmente con scripts Python.

**Consecuencias:**
- No hay paginación; todos los datos se cargan de una vez en el frontend
- Los GeoJSON grandes (>10 MB) son un riesgo de rendimiento — mitigar con carga diferida y memoización
- Para GTFS-RT futuro, sí se necesitaría un backend o proxy

---

## ADR-003 — Zustand para estado global 🟡

**Fecha:** inicio del proyecto
**Estado:** activo

**Decisión:** Usar Zustand en lugar de Redux, Context API o Jotai.

**Contexto:** El estado global del visualizador (filtros, modos de color, viewport, rutas seleccionadas) es amplio pero no complejo en estructura. Zustand es minimalista y evita el boilerplate de Redux.

**Consecuencias:**
- Selectores nominales exportados obligatorios (`useColorMode`, `useViewState`, etc.)
- Prohibido `useStore(s => s.x)` disperso en componentes

---

## ADR-004 — `powerPreference: 'default'` en WebGL 🔴

**Fecha:** 2026-05 (detectado en testing móvil)
**Estado:** activo

**Decisión:** Usar `powerPreference: 'default'` en `glOptions` del componente DeckGL, no `'high-performance'`.

**Contexto:** `'high-performance'` causa fallos de renderizado en chips móviles de gama media/baja (Snapdragon 6xx, MediaTek Dimensity) bajo Chrome Android. El visualizador debe funcionar en móvil.

**Consecuencias:**
- Rendimiento ligeramente inferior en escritorio con GPU dedicada (aceptable)
- Sin crasheos en Chrome Android

---

## ADR-005 — JavaScript puro sin TypeScript 🟡

**Fecha:** inicio del proyecto
**Estado:** activo

**Decisión:** Mantener el proyecto en JS puro (`.js`/`.jsx`). No migrar a TypeScript.

**Contexto:** El equipo prioriza velocidad de iteración sobre seguridad de tipos. La fricción de TypeScript con Deck.gl (tipos complejos de capas) no vale el beneficio en esta fase.

**Consecuencias:**
- No crear archivos `.ts`/`.tsx` — ver Lista de Nunca en `CLAUDE.md`
- Alternativa gradual: `// @ts-check` + JSDoc (TODO.md #B6)

---

## ADR-006 — Pipeline Python local, sin CI/CD de datos 🟢

**Fecha:** inicio del proyecto
**Estado:** activo

**Decisión:** El pipeline GTFS → GeoJSON se ejecuta manualmente en local. No hay automatización CI/CD para regenerar los datos.

**Contexto:** El feed GTFS se actualiza pocas veces al año. Automatizar el pipeline requeriría infraestructura y acceso al feed desde CI, lo que no justifica el esfuerzo.

**Consecuencias:**
- Los datos en `public/data/` son snapshots generados manualmente
- Al actualizar el feed, se deben re-ejecutar todos los scripts Python en orden
