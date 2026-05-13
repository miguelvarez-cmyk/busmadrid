/**
 * Ray-casting point-in-polygon for GeoJSON geometries.
 */

function rayInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygonCoords(px, py, rings) {
  if (!rayInRing(px, py, rings[0])) return false;
  for (let h = 1; h < rings.length; h++) {
    if (rayInRing(px, py, rings[h])) return false;
  }
  return true;
}

function geomBbox(geom) {
  if (geom._bbox) return geom._bbox;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = ([x, y]) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  };
  if (geom.type === 'Polygon') geom.coordinates.flat().forEach(visit);
  else if (geom.type === 'MultiPolygon') geom.coordinates.flat(2).forEach(visit);
  geom._bbox = { minX, minY, maxX, maxY };
  return geom._bbox;
}

export function pointInGeometry(px, py, geom) {
  if (!geom) return false;
  const bb = geomBbox(geom);
  if (px < bb.minX || px > bb.maxX || py < bb.minY || py > bb.maxY) return false;
  if (geom.type === 'Polygon') return pointInPolygonCoords(px, py, geom.coordinates);
  if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (pointInPolygonCoords(px, py, poly)) return true;
    }
    return false;
  }
  return false;
}

export function pointInAnyGeometry(px, py, geometries) {
  for (const geom of geometries) {
    if (pointInGeometry(px, py, geom)) return true;
  }
  return false;
}
