/**
 * Devuelve el Set de route_ids cuyas geometrías tienen al menos un vértice
 * dentro del bbox [minLng, minLat, maxLng, maxLat].
 * Suficiente para shapes con muchos vértices (paradas EMT cada ~50-200 m).
 */
export function routesInBBox(geojson, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const ids = new Set();
  if (!geojson) return ids;
  for (const f of geojson.features) {
    const lines = f.geometry.coordinates;
    let inside = false;
    for (const line of lines) {
      for (let i = 0; i < line.length; i++) {
        const lng = line[i][0];
        const lat = line[i][1];
        if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
          inside = true;
          break;
        }
      }
      if (inside) break;
    }
    if (inside) ids.add(f.properties.route_id);
  }
  return ids;
}

/**
 * Normaliza dos puntos (en pixels o en lon/lat) a [min1, min2, max1, max2].
 */
export function normalizeBox(p1, p2) {
  return [
    Math.min(p1[0], p2[0]),
    Math.min(p1[1], p2[1]),
    Math.max(p1[0], p2[0]),
    Math.max(p1[1], p2[1]),
  ];
}
