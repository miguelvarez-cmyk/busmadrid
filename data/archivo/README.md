# Datos archivados

Datos que la web dejó de usar en el rediseño de octubre de 2026 y que se guardan
fuera de `public/` para que no se publiquen:

- `metro_cercanias_routes.geojson`, `metro_cercanias_stops.geojson`: capa de Metro.
- `barrios.geojson`, `route_districts.json`: selección de líneas por barrio/distrito;
  servirán para la futura ficha de barrio.

Los regeneran `scripts/process_metro_cercanias.py` y `scripts/compute_districts.py`.
