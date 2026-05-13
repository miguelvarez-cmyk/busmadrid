# Ideación: próximas mejoras y features

Documento vivo con ideas de mejora para el **Visualizador GTFS Madrid**.
Cada bloque indica **prioridad** (alta/media/baja), **complejidad** (S/M/L/XL) y **valor**.

> Última actualización: 2026-05-13
> Estado actual: tooltip enriquecido, leyenda de color flotante, URL sync, drawer de detalle de línea y buscador de paradas/direcciones implementados.

---

## 1. Análisis y métricas avanzadas

### 1.1 Comparativa entre líneas seleccionadas — ⭐ alta · M
Cuando el usuario selecciona varias líneas, mostrar un panel agregado con:
- Frecuencia media en hora punta
- Velocidad media
- Ocupación media combinada
- Nº de paradas comunes / específicas
- Solapamiento de itinerarios (%)

**Por qué:** comparar dos líneas equivalentes (p. ej. 27 vs 14) es uno de los usos analíticos más frecuentes y hoy hay que ir alternando modos.

### 1.2 Métricas agregadas por barrio/distrito — ⭐ alta · M
Al pinchar un distrito o barrio:
- Líneas que lo sirven (ya existe)
- Paradas en su interior
- Frecuencia media combinada en hora punta
- Cobertura: % de superficie a < 300 m de una parada
- Población servida (requiere capa demográfica externa)

**Por qué:** análisis territorial de la oferta. Encaja con el panel "Barrios" actual.

### 1.3 Heatmap de demanda — media · M
Capa de heatmap (`@deck.gl/aggregation-layers`) de viajeros/día por parada o por línea.
Útil cuando se desactivan filtros y se quiere ver patrón global.

### 1.4 Análisis de transbordos / hubs — media · L
Detectar paradas con muchas líneas que crean polos de conexión y resaltarlos como nodos de la red. Posiblemente un grafo: nodo = parada, arista = línea compartida.

### 1.5 Matriz origen-destino agregada — baja · XL
Si EMT publica O-D, integrar como capa de flujos (arcos curvos entre centroides de barrios). Requiere fuente de datos externa.

---

## 2. Tiempo y temporalidad

### 2.1 Animación de evolución horaria — ⭐ alta · M
Slider/play sobre el rango horario que anima el coloreado de frecuencia. Permite ver cómo cambia la oferta a lo largo del día.

**Implementación:** ya tenemos `serviceMetrics` con datos hora-a-hora; solo falta UI de timeline + actualizar `colorMode='offer'` con currentHour.

### 2.2 Comparativa día-a-día (Lab vs Sáb vs Festivo) — media · S
Modo split-view o overlay que muestra a la vez frecuencia laboral y festiva sobre la misma línea. Diff visual.

### 2.3 Detección de "huecos de servicio" — media · M
Resaltar líneas o tramos horarios donde el intervalo entre expediciones supera un umbral (p. ej. > 30 min). Útil para analizar calidad nocturna.

---

## 3. Posicionamiento e interacción

### 3.1 ~~Búsqueda por dirección/parada~~ — ✅ completado (2026-05-13)
Barra flotante centrada en la parte superior del mapa. Búsqueda local de paradas (por nombre/código) + geocodificación Nominatim acotada a Madrid. Click → anima viewport a la ubicación.

### 3.2 ~~Estado compartible vía URL~~ — ✅ completado (2026-05-13)
Hook `useUrlSync` sincroniza viewport, colorMode, selectedRouteIds, basemap, showStops y stopColorMode con `?search`. Sin dependencias externas. Debounce 300 ms, `replaceState` sin crear historial.

### 3.3 ~~Detalle de línea (drawer)~~ — ✅ completado (2026-05-13)
Panel lateral derecho (340px) al hacer click en una línea. Muestra: longitud, duración, velocidad, demanda, flota, horario + gráfico de barras 24h de expediciones + botón "Centrar en mapa". En móvil: panel inferior (72dvh). Cierre con ×, Escape o click en mapa vacío.

### 3.4 Selección por trazado — baja · L
Dibujar una línea/polígono libre y seleccionar las paradas o líneas que lo intersecan. Complementa el "Área" actual (rectángulo).

---

## 4. Datos en tiempo real

### 4.1 Posiciones de vehículos (GTFS-RT) — ⭐ alta · L
Si EMT publica feed GTFS-Realtime, mostrar buses como puntos animados (`IconLayer` o `ScatterplotLayer` con interpolación entre actualizaciones).

**Dependencias:** endpoint GTFS-RT (API EMT requiere registro), parser de protobuf en frontend.

### 4.2 Comparación oferta vs realidad — media · L
Si tenemos GTFS-RT histórico, comparar la frecuencia teórica con la observada. Detección de retrasos sistemáticos.

---

## 5. Performance y arquitectura

### 5.1 Code-splitting — media · S
El bundle actual avisa: `index-*.js: 933 kB`, `maplibre-gl: 802 kB`.
Aplicar `manualChunks` en Vite + `lazy import` para componentes pesados (DistrictsPanel, OtrosPanel).

### 5.2 Tile vectorial propio para rutas — baja · L
Servir `routes.geojson` (decenas de MB) como MVT (`tippecanoe` → carpeta de tiles) en lugar de GeoJSON único. Mucho mejor en móvil.

### 5.3 Memoización agresiva en App.jsx — media · S
El `useMemo` de `layers` en App.jsx tiene >20 dependencias. Refactorizar para extraer subhooks (`useRoutesLayer`, `useStopsLayer`) y reducir invalidaciones.

### 5.4 Web Workers para cómputos pesados — baja · M
Mover `applyModeFilter`, `frequencyHistogram`, etc. a un worker cuando se procesen >500 líneas a la vez.

---

## 6. UX y acabado

### 6.1 ~~Hover info enriquecido~~ — ✅ completado (2026-05-12)
Tooltip muestra siempre nº, nombre, longitud, horario, velocidad y demanda. Detecta líneas superpuestas (80 m reales, mín 15 px) y permite ciclar entre ellas con Tab / Shift+Tab.

### 6.2 ~~Leyenda persistente~~ — ✅ completado (2026-05-13)
Componente `ColorLegend` centrado en la parte inferior del mapa. Gradiente verde→amarillo→rojo con etiquetas de mín/máx para modos continuos; chips de colores categóricos para frecuencia y tortuosidad.

### 6.3 Estado vacío más informativo — baja · S
Cuando no hay líneas seleccionadas, en lugar de mapa vacío, ofrecer atajos: "Ver todas las nocturnas", "Mostrar líneas del distrito Centro".

### 6.4 Modo claro real — media · S
Hoy el "Claro" es CARTO Dark Matter (oscuro). Añadir CARTO Positron como verdadero modo claro y reorganizar los basemaps:
- `light` → Positron (claro real)
- `dark` → Dark Matter
- `osm` → OSM raster
- `satellite` → Esri imagery

### 6.5 Pulir el sidebar móvil — media · S
El bottom-sheet móvil funciona pero le falta:
- Drag-handle visible para subir/bajar
- Snap a alturas (25%, 50%, 90%)
- Cierre por swipe-down

### 6.6 Accesibilidad — media · M
Ya hay `aria-*` en algunos sitios. Auditar con axe:
- Foco visible en botones del sidebar
- Skip-to-content
- `aria-live` en histogramas que cambian al ajustar slider

---

## 7. Datos derivados (nuevos scripts Python)

### 7.1 `compute_coverage.py` — media · M
Para cada parada, calcular el polígono de cobertura (buffer 300 m + clip por barrio). Salida: `public/data/stop_coverage.geojson`.
Usado en métricas de cobertura territorial (1.2).

### 7.2 `compute_transfers.py` — media · M
Detectar pares de paradas a < 100 m servidas por líneas distintas → grafo de transbordos. Salida: `transfer_edges.geojson`.

### 7.3 Demanda por hora — baja · L
Hoy `route_demand.json` es solo `dailyAvg`. Si la EMT publica viajeros por franja horaria, incluirlo y derivar ocupación hora-a-hora (no solo media diaria como ahora).

---

## 8. Tooling y calidad

### 8.1 Tests de utilidades — media · M
`src/utils/service.js` y `src/utils/routeGroups.js` tienen lógica densa (parseos, color scales, bucketing) y cero tests. Vitest + tests unitarios sobre los casos críticos.

### 8.2 JSDoc / tipos `// @ts-check` — baja · M
Sin migrar a TypeScript, marcar archivos con `// @ts-check` y JSDoc en utilidades. VSCode da chequeo gradual.

### 8.3 Storybook para paneles — baja · M
Permitiría iterar visualmente sobre `OtrosPanel`, `DistrictsPanel`, etc. sin levantar todo el mapa.

---

## Roadmap sugerido (próximas 3 sesiones)

1. **Sesión próxima:** **animación temporal (2.1)** + **métricas agregadas por barrio (1.2)**.
2. **Sesión +1:** **pulir sidebar móvil (6.5)** + **code-splitting (5.1)**.
3. **Sesión +2:** **posiciones GTFS-RT (4.1)** si hay acceso a la API EMT.

GTFS-RT (4.1) queda fuera del roadmap inmediato porque depende de acceso a la API.
