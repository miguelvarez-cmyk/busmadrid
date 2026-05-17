# SPEC.md — Especificación del Visualizador GTFS Madrid

> Triage: requisitos estables · Última revisión: 2026-05-17
> Ver también: [TODO.md](TODO.md) (tareas activas) · [ISSUES.md](ISSUES.md) · [SCHEMA.md](SCHEMA.md)

---

## Requisitos funcionales

### RF-01 Visualización de red
- Mostrar recorridos de líneas de bus EMT sobre mapa interactivo
- Mostrar paradas con agrupación por zoom
- Soportar selección múltiple de líneas

### RF-02 Modos de color de líneas
- `offer` — Frecuencia (expediciones/hora punta laborable)
- `schedule` — Horario de paso (intervalo medio)
- `speed` — Velocidad comercial media
- `tortuosity` — Índice de tortuosidad del recorrido
- `fleet` — Número de vehículos asignados
- `demand` — Viajeros/día (datos EMT 2025)
- `occupancy` — Ocupación media (demanda / expediciones lunes)
- `null` — Color por defecto de línea

### RF-03 Modos de color de paradas
- `routes` — Número de líneas que sirven la parada
- `expeditions` — Pico de expediciones laborables en la parada
- `null` — Color neutro

### RF-04 Filtros
- Filtro por línea individual o grupo (selector + búsqueda)
- Filtro por barrio/distrito (selección en mapa o lista)
- Filtro por área (rectángulo dibujado en mapa)
- Toggle de visibilidad de paradas

### RF-05 Detalle de línea
- Panel lateral (drawer) al hacer clic en una línea
- Muestra: longitud, duración, velocidad, demanda, flota, horario
- Gráfico de barras de expediciones por hora (24h)
- Botón "Centrar en mapa"

### RF-06 Búsqueda
- Búsqueda local de paradas por nombre o código
- Geocodificación Nominatim acotada a Madrid
- Animación de viewport a la ubicación seleccionada

### RF-07 URL compartible
- Estado sincronizado en `?search`: viewport, colorMode, selectedRouteIds, basemap, showStops, stopColorMode
- Debounce 300 ms, `replaceState` sin crear historial

### RF-08 Compatibilidad móvil
- Sidebar como bottom-sheet en ≤720 px
- Soporte Chrome Android sin `powerPreference: 'high-performance'`
- Adaptación a barra URL dinámica con `100dvh`

---

## Requisitos no funcionales

- RNF-01: Primera carga de datos en < 5 s en conexión 4G
- RNF-02: Renderizado fluido (≥ 30 fps) con todas las líneas visibles en escritorio
- RNF-03: Sin dependencias de API externas en tiempo de ejecución (excepto Nominatim para geocodificación)
- RNF-04: Bundle JS < 2 MB tras build de producción
- RNF-05: Sin errores de ESLint en CI (`npm run lint` con `--max-warnings 0`)

---

## Historias de usuario

**HU-01 — Analista de transporte:**
> "Quiero comparar la frecuencia de dos líneas en hora punta para identificar cuál está infraserviciada."

**HU-02 — Planificador urbano:**
> "Quiero ver qué barrios tienen baja cobertura de bus para priorizar nuevas líneas."

**HU-03 — Usuario ocasional:**
> "Quiero buscar mi parada y ver cuántos buses la sirven y con qué frecuencia."

**HU-04 — Investigador de movilidad:**
> "Quiero filtrar por velocidad comercial para detectar tramos congestionados."

---

## Alcance MVP (ya implementado)

- Visualización de rutas y paradas con todos los modos de color
- Drawer de detalle de línea con gráfico horario
- Filtro por línea, barrio y área
- Búsqueda de paradas + geocodificación
- URL compartible
- Compatibilidad móvil básica
- Tooltip enriquecido con detección de líneas superpuestas
- Leyenda de color persistente

---

## NO construir (lista explícita)

- Autenticación de usuarios o login
- Backend propio / API REST (los datos son estáticos)
- Edición de datos GTFS desde el frontend
- GTFS-RT (tiempo real) hasta tener acceso confirmado a API EMT
- Migración a TypeScript (decisión explícita de mantener JS)
- Tests de integración con base de datos (no hay base de datos)
- Panel de administración
- Exportación de datos desde el frontend


---

## Glosario GTFS

| Término | Definición en este proyecto |
|---|---|
| `agency` | EMT (Empresa Municipal de Transportes de Madrid) |
| `route` | Línea de bus (p.ej. "27", "N1"). En el frontend: `route_id` |
| `trip` | Un recorrido concreto de una línea en un día/hora. Múltiples trips por route |
| `stop` | Parada física con coordenadas. `stop_id` es el identificador estable |
| `stop_time` | Registro de paso de un trip por una parada con hora estimada |
| `shape` | Traza geográfica (polilínea) de un trip. Agregada por route en `routes.geojson` |
| `calendar` | Días de servicio por `service_id` (laborable, sábado, festivo) |
| `feed_info` | Metadatos del feed (versión, rango de fechas de validez) |
| `route_short_name` | Número visible de línea (p.ej. "27") |
| `route_long_name` | Nombre descriptivo (p.ej. "Embajadores - Fuencarral") |
| `direction_id` | 0 o 1 (ida/vuelta). Ambas agregadas en `routes.geojson` |
| `dow` | Day of week en `service_metrics.json`: string "0"=lunes … "6"=domingo |

---

## Criterios de verificación

| ID | Criterio | Cómo verificar |
|---|---|---|
| V-01 | Todas las líneas visibles al cargar | `npm run dev` → mapa muestra líneas sin errores en consola |
| V-02 | Modos de color funcionan | Activar cada `colorMode` → gradiente verde-amarillo-rojo visible |
| V-03 | Drawer de línea abre y muestra gráfico | Clic en línea → panel lateral con barras de 24h |
| V-04 | Búsqueda encuentra paradas | Escribir nombre parcial → resultados en dropdown |
| V-05 | URL compartible persiste estado | Copiar URL → abrir en nueva pestaña → mismo estado |
| V-06 | Móvil sin crasheo | DevTools 375px → sidebar como bottom-sheet |
| V-07 | Lint pasa sin warnings | `npm run lint` → exit 0 |
