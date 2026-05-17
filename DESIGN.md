# DESIGN.md — Sistema de Diseño Visual e Interacción

> Triage: decisiones estables · Secciones 🔒 no modificar sin consenso
> Ver también: [DECISIONS.md](DECISIONS.md) · [SPEC.md](SPEC.md)

---

## Visual 🔒

### Paleta y tokens CSS

Definidos en `:root` de `src/index.css`. Usar siempre las variables, nunca colores hardcoded.

```css
--color-accent: #1976d2
--color-accent-hover: #1a6ee6
--color-accent-light: #2a5a9c

--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px

--z-base: 10
--z-overlay: 20
--z-panel: 30
--z-drawer: 40
--z-search: 50
```

### Gradiente de color universal 🔒

**Todos los histogramas y capas de visualización DEBEN usar este gradiente.**

```
verde [50, 200, 50] → amarillo [220, 200, 50] → rojo [220, 50, 50]
```

Fórmula (t ∈ [0, 1]):
```js
if (t < 0.5) {
  const k = t / 0.5;
  return [Math.round(50 + 170 * k), 200, 50];  // verde → amarillo
}
const k = (t - 0.5) / 0.5;
return [220, Math.round(200 - 150 * k), 50];    // amarillo → rojo
```

Aplica en: `fleetColor()`, `demandColor()`, `speedColor()`, `scheduleColor()`, `stopRoutesColor()`, `occupancyColorForRoute()`, buckets de histogramas, capas Deck.gl.

### Basemaps disponibles

| Key | Nombre | Tipo |
|---|---|---|
| `dark` | CARTO Dark Matter | Vector (por defecto) |
| `light` | CARTO Positron | Vector |
| `osm` | OpenStreetMap | Raster |
| `satellite` | Esri Imagery | Raster |

### Tipografía

Sistema de fuentes del OS (sin fuente personalizada). `font-size` base: 13–14px en sidebar.

### Iconografía

Sin librería de iconos — se usan caracteres Unicode directamente: `☰` (menú), `✕` (cerrar), `▼` (acordeón), `▭` (área), `◎` (estado).

---

## Interacción 🔓

### Estados del mapa

| Estado | Descripción | Visual |
|---|---|---|
| Cargando | Datos GTFS en fetch | Punto naranja parpadeante en header del sidebar |
| Datos listos | Todas las capas activas | Punto verde en header |
| Sin selección | Ninguna línea seleccionada | Mapa con todas las líneas en color por defecto |
| Filtrado | Líneas activas filtradas | Solo las líneas seleccionadas visibles |
| Modo color activo | `colorMode !== null` | Gradiente verde-amarillo-rojo + leyenda flotante |

### Sidebar

- **Escritorio (>720px):** panel fijo a la izquierda, 320px de ancho
- **Móvil (≤720px):** bottom-sheet desde abajo; `height: 100dvh` con `env(safe-area-inset-bottom)`
- **Acordeón:** transición con `grid-template-rows: 0fr → 1fr`; lazy mounting de children
- **Botón toggle:** `☰` cuando cerrado, `✕` cuando abierto; mínimo 44×44px (WCAG 2.5.5)
- **Atajo teclado:** `[` abre/cierra el sidebar (ignorado si foco en input)

### Drawer de línea

- **Escritorio:** panel lateral derecho, 340px
- **Móvil:** panel inferior, 72dvh
- **Apertura:** clic en cualquier punto de una línea en el mapa
- **Cierre:** botón `×`, tecla `Escape`, clic en área vacía del mapa

### Tooltip de hover

- Aparece al pasar sobre una línea o parada
- `pointer-events: none` — no bloquea clics al mapa
- Detecta líneas superpuestas (radio 80 m reales, mínimo 15 px)
- Permite ciclar entre líneas superpuestas con Tab / Shift+Tab

### Búsqueda

- Barra flotante en la parte superior del mapa
- Se activa con ≥ 2 caracteres
- Muestra estado vacío "Sin resultados para…" si no hay coincidencias
- Clic en resultado: anima viewport con `flyTo`

### Estados vacíos

| Componente | Estado vacío |
|---|---|
| `OtrosPanel` | "Sin datos disponibles" (nunca `return null`) |
| `SearchBar` | "Sin resultados para «query»" |
| Checkbox paradas sin datos | `opacity: 0.5` + texto "(cargando…)" |

---

## Librerías UI pre-aprobadas 🔒

Lista cerrada. **Prohibido importar fuera de esta lista** sin aprobación explícita.

| Librería | Versión | Uso |
|---|---|---|
| `react` | ^18.3.1 | Componentes |
| `react-dom` | ^18.3.1 | Renderizado |
| `@deck.gl/core` | ^9.0.0 | Motor de capas |
| `@deck.gl/layers` | ^9.0.0 | Capas estándar |
| `@deck.gl/react` | ^9.0.0 | Integración React |
| `maplibre-gl` | ^4.0.0 | Basemap |
| `react-map-gl` | ^7.1.7 | Wrapper React para MapLibre |
| `zustand` | ^4.5.4 | Estado global |

Sin librería de componentes UI (MUI, Chakra, etc.) — todo CSS propio.

---

## Accesibilidad (requerimientos mínimos) 🔒

- `:focus-visible` en todos los elementos interactivos
- `aria-hidden="true"` en iconos decorativos
- `aria-expanded` en cabeceras de acordeón
- `prefers-reduced-motion: reduce` desactiva animaciones
- Contraste mínimo WCAG AA en textos sobre fondo oscuro
- Botones mínimo 44×44px en móvil
