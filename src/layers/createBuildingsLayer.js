import { GeoJsonLayer } from '@deck.gl/layers';

// Verde degradado: sin población = gris, máximo = verde saturado
// Rango típico: 0 – ~200 hab (99th percentile), valores outlier hasta ~1900
const MAX_POP = 150; // cap visual

function buildingColor(poblacion) {
  const t = Math.min(poblacion / MAX_POP, 1);
  // Transparente/gris para edificios casi vacíos, verde intenso para muy poblados
  const alpha = Math.round(60 + 170 * t);   // 60–230
  const green = Math.round(120 + 135 * t);  // 120–255
  const red   = Math.round(40  - 30  * t);  // 40–10
  const blue  = Math.round(40  - 30  * t);  // 40–10
  return [red, green, blue, alpha];
}

export function createBuildingsLayer({ features }) {
  if (!features?.length) return null;

  return new GeoJsonLayer({
    id: 'buildings-coverage',
    data: { type: 'FeatureCollection', features },
    filled: true,
    stroked: false,
    getFillColor: (f) => buildingColor(f.properties.poblacion ?? 0),
    pickable: false,
    parameters: { depthTest: false },
    updateTriggers: {
      getFillColor: [features.length],
    },
  });
}
