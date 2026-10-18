# Rediseño UX — especificación (grill 2026-10-18)

Usuario: especialista en transporte. Tarea nº 1: **diagnóstico de red**.
Principio: máxima sencillez arriba, profundidad completa a un clic.
Escritorio primero; en móvil solo consulta (mapa + indicador + ficha).

## Estructura de pantalla

```
┌ [Indicador ▾] ⓘ · Laborable · 07–09h · 2025 · [filtros como etiquetas ×] ┐
├───────────────────────────────┬───────────────────────────────────────────┤
│                               │ TABLA RANKING (ordenable, ensanchable)    │
│            MAPA               │  línea · indicador activo · cols. config. │
│                     [Paradas] │  [↓CSV]                                   │
│ (leyenda + histograma: arriba izquierda)  clic → FICHA (sustituye a la tabla) │
└───────────────────────────────┴───────────────────────────────────────────┘
```

- Desaparece el acordeón de 10 secciones.
- Al entrar: red neutra (colores corporativos), sin indicador activo.
- La URL refleja el estado completo: indicador, tiempo, filtros, línea abierta, fichas fijadas y vista del mapa.

## Contexto temporal global

Un único **tipo de día + franja horaria + año** en la barra superior que afecta a todos los indicadores.
En los que no dependen de un control, ese control se ve desactivado (p. ej. la franja en Amplitud).
El radio de Población servida es un parámetro que solo aparece con ese indicador activo.

## Catálogo de indicadores (selector único agrupado)

| Grupo | Indicador | Color |
|---|---|---|
| Oferta | Intervalo medio (min) | bajo = verde |
| Oferta | Expediciones/día (**nuevo**) | alto = verde |
| Oferta | Amplitud de servicio (h) (antes "Horario de paso") | alto = verde |
| Oferta | Flota (buses) | neutro, 1 tono |
| Demanda | Viajeros/día | neutro, 1 tono |
| Demanda | Δ% interanual (**nuevo**) | divergente: + verde / − rojo |
| Demanda | Viajeros/expedición (fusiona "pax/expedición" y "Carga por hora"; día completo = diario) | alto = rojo (saturación) |
| Rendimiento | Velocidad comercial (km/h) | alto = verde |
| Trazado | Longitud (km) | neutro, 1 tono |
| Trazado | Tortuosidad | alto = rojo |
| Trazado | Divergencia ida/vuelta (%) | neutro, 1 tono |
| Territorio | Población servida (hab) | alto = verde |

Desaparece el término "ocupación". Los textos son técnicos y secos: nombre + unidad.
La definición va en un ⓘ (fórmula en una línea) que enlaza a la página **/metodologia** (fuentes, fechas del GTFS y de la demanda, limitaciones).

## Filtros

- **Combinados**: condiciones sobre cualquier indicador (p. ej. velocidad < 12 Y viajeros > 20k), aunque no sea el que colorea.
- Se fijan desde el histograma o desde la cabecera de la tabla y se muestran como etiquetas eliminables en la barra superior.
- Las líneas que no cumplen los filtros se **atenúan en gris**; no se ocultan.
- Filtro **Líneas**: buscar, elegir por grupo (diurnas, nocturnas…) o dibujar un rectángulo en el mapa.
- Se quita la selección por barrio. El barrio pasa al roadmap como entidad propia, con su ficha de barrio.

## Tabla ranking

- Siempre visibles: línea + indicador activo.
- Columnas configurables: arranca con un set por defecto de 4–5.
- El panel se puede ensanchar.
- Los valores se calculan en el contexto temporal activo.

## Ficha de línea

- Muestra **todos** los indicadores, cada uno con su valor y una mini barra de percentil (mediana marcada).
- Gráficos horarios: expediciones y viajeros/expedición por hora; viajeros por mes.
- **Fijar 📌**: las fichas fijadas se apilan en columnas para comparar, con gráficos superpuestos (un color por línea).

## CSV

1. Tabla visible: líneas filtradas, todos los indicadores, cabecera con día, franja y año.
2. Perfiles horarios de las líneas abiertas o fijadas.
3. Paradas con sus líneas y expediciones.

(Anula el "NO construir: exportación" de SPEC.md.)

## Capas de contexto

- Solo **Paradas**, con su coloreado propio (nº de líneas o expediciones) dentro del control de capas.
- Metro, Carril bus y Bandas SER se quitan del front. Sus GeoJSON se guardan en el repo fuera de `public/` (y por tanto fuera de `dist/`).
- Mapa base a elegir en el control de capas: oscuro, gris claro, OpenStreetMap o satélite. Modo claro/oscuro con el botón ☀/☾ (añadido el 2026-10-18, ADR-009).

## Guía de bienvenida

- 11 pasos, una funcionalidad por paso (`src/components/Tour.jsx`, animaciones en `TourAnims.jsx`): bienvenida, indicador, contexto temporal, filtro por valor, líneas, tabla, ficha y comparación, mapa y paradas, CSV, metodología y tema, cierre.
- Se abre sola en la primera visita (`localStorage` `busmadrid-tour-done`). «Saltar» o Esc la cierran. El botón **?** de la barra la reabre.
- Tono: título + una frase. Cada paso añade un elemento real y lleva una animación SVG del gesto.

## Entrega

Todo en una rama. Revisión en local con `npm run dev`. Se publica de una vez tras el visto bueno.

## Reglas 🔒 de CLAUDE.md afectadas (aprobadas en el grill)

- "Sidebar: N secciones en acordeón (orden vinculante)" → sustituida por la estructura de arriba.
- "Gradiente universal verde→rojo" → sustituida por la semántica de color por indicador.
- SPEC.md "NO construir: exportación de datos" → eliminada.
