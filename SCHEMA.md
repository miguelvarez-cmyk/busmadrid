# SCHEMA.md — Modelo de Datos

> Triage: esquema estable · Cambios requieren actualizar scripts Python y frontend
> Ver también: [SPEC.md](SPEC.md#glosario-gtfs) (glosario) · [DECISIONS.md](DECISIONS.md) (ADR-002)

---

## Entradas GTFS (`data/raw/GTFS/`)

Archivos requeridos del feed EMT. Sin ellos, el pipeline falla con error claro.

| Archivo | Campos clave usados |
|---|---|
| `agency.txt` | `agency_id`, `agency_name` |
| `routes.txt` | `route_id`, `route_short_name`, `route_long_name`, `route_color`, `route_type` |
| `trips.txt` | `trip_id`, `route_id`, `service_id`, `shape_id`, `direction_id` |
| `stop_times.txt` | `trip_id`, `stop_id`, `arrival_time`, `departure_time`, `stop_sequence` |
| `stops.txt` | `stop_id`, `stop_name`, `stop_code`, `stop_lat`, `stop_lon` |
| `shapes.txt` | `shape_id`, `shape_pt_lat`, `shape_pt_lon`, `shape_pt_sequence` |
| `calendar.txt` | `service_id`, `monday`…`sunday`, `start_date`, `end_date` |

---

## Salidas procesadas (`public/data/`)

Servidos estáticamente por Vite en `/data/`. El frontend hace `fetch('/data/...')` desde `useGTFSData.js`.

**Requeridos** (fallo fatal si faltan — `Promise.all` rechaza):
`routes.geojson`, `routes_meta.json`, `service_metrics.json`, `stops.geojson`, `route_speed.json`, `route_demand.json`, `route_fleet.json`, `route_tortuosity.json`

**Opcionales** (`.catch(() => null)` — la app funciona sin ellos, las secciones del sidebar muestran estado vacío):
`route_schedule.json`, `route_districts.json`, `barrios.geojson`, `stop_expeditions.json`, `route_coverage.json`, `metro_cercanias_routes.geojson`, `metro_cercanias_stops.geojson`

### `routes.geojson`
GeoJSON FeatureCollection. Una Feature por `route_id`, geometría MultiLineString (ambos sentidos agregados).

```js
{
  type: "Feature",
  geometry: { type: "MultiLineString", coordinates: [...] },
  properties: {
    route_id: string,       // "27"
    route_short_name: string,
    route_long_name: string,
    route_color: string,    // hex sin "#", p.ej. "E0001B"
    route_type: number      // 3 = bus
  }
}
```

### `routes_meta.json`
Array (no objeto). Orden determinado por el script Python.
```js
[
  {
    id: string,             // route_id
    shortName: string,
    longName: string,
    color: string,          // hex sin "#"
    type: number
  },
  ...
]
```

### `stops.geojson`
GeoJSON FeatureCollection. Una Feature por parada física.

```js
{
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: {
    stop_id: string,
    stop_name: string,
    stop_code: string,
    routes: string[]        // route_ids que pasan por esta parada
  }
}
```

### `service_metrics.json`
```js
{
  byRoute: {
    [route_id]: {
      [dow]: {              // "0"=lunes … "6"=domingo (string)
        [direction_id]: number[]  // "0" o "1" → array[24] de expediciones por hora
      }
    }
  }
}
```
Ejemplo: `byRoute["27"]["1"]["0"][8]` = expediciones de la línea 27, lunes, dirección 0, a las 8h.
Nota: `dow="1"` (lunes) se usa como representante de día laborable. El array tiene índice = hora (0–23).

### `route_demand.json`
```js
{
  byRoute: {
    [route_id]: {
      dailyAvg: number,     // viajeros/día promedio 2025
      total: number,        // viajeros total en el periodo
      days: number          // días del periodo
    }
  }
}
```

### `route_fleet.json`
```js
{ byRoute: { [route_id]: number } }  // nº de vehículos asignados
```

### `route_speed.json`
```js
{ byRoute: { [route_id]: number } }  // velocidad comercial media (km/h)
```

### `route_tortuosity.json`
```js
{ byRoute: { [route_id]: number } }  // índice de tortuosidad (distancia real / distancia euclidea)
```

### `route_schedule.json`
```js
{
  byRoute: {
    [route_id]: {
      firstDeparture: string,  // "06:00"
      lastDeparture: string,   // "23:30"
      peakInterval: number     // intervalo medio en hora punta (min)
    }
  }
}
```

### `stop_expeditions.json`
```js
{
  byStop: {
    [stop_id]: {
      peak: number   // pico horario de expediciones en día laborable
    }
  }
}
```

### `route_coverage.json`
```js
{
  byRoute: {
    [route_id]: {
      "300": number,   // habitantes cubiertos a 300 m
      "500": number,   // habitantes cubiertos a 500 m
      "1000": number   // habitantes cubiertos a 1000 m
    }
  }
}
```
La clave de distancia coincide con `coverageDistance` del store (string).

### `route_districts.json`
```js
{
  [route_id]: string[]   // lista de district_ids que sirve la línea
}
```

### `barrios.geojson`
GeoJSON FeatureCollection de polígonos de barrios/distritos de Madrid con `district_id` y `district_name` en properties.

### `metro_cercanias_routes.geojson`
GeoJSON FeatureCollection de líneas de Metro y Cercanías de Madrid. Properties: `route_id`, `route_color`, `mode` (`"metro"` | `"cercanias"`).

### `metro_cercanias_stops.geojson`
GeoJSON FeatureCollection de paradas de Metro y Cercanías. Properties: `stop_id`, `stop_name`, `route_id`, `mode`.

---

## Relaciones e integridad referencial

```
routes.geojson.properties.route_id
  └── routes_meta.json[route_id]
  └── service_metrics.json.byRoute[route_id]
  └── route_demand.json.byRoute[route_id]
  └── route_fleet.json.byRoute[route_id]
  └── route_speed.json.byRoute[route_id]
  └── route_tortuosity.json.byRoute[route_id]
  └── route_schedule.json.byRoute[route_id]
  └── route_districts.json[route_id]

stops.geojson.properties.stop_id
  └── stop_expeditions.json.byStop[stop_id]
  └── stops.geojson.properties.routes[] → route_id

barrios.geojson.properties.district_id
  └── route_districts.json[route_id][]
```

**Invariante clave:** todo `route_id` presente en `routes.geojson` debe existir en `routes_meta.json`. El pipeline lo garantiza; si falta, la capa de rutas renderiza sin color.

---

## Log de migraciones de esquema

| Fecha | Campo | Cambio |
|---|---|---|
| 2026-05-17 | Documentación inicial | Primera versión de SCHEMA.md |
