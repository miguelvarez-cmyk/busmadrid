import { ScatterplotLayer } from '@deck.gl/layers';

export function createStopsLayer({ geojson, selectedRouteIds, onHover, visible }) {
  if (!geojson || !visible) return null;

  const data = geojson.features.filter((f) => {
    const routes = f.properties.routes;
    for (let i = 0; i < routes.length; i++) {
      if (selectedRouteIds.has(routes[i])) return true;
    }
    return false;
  });

  return new ScatterplotLayer({
    id: 'stops',
    data,
    getPosition: (f) => f.geometry.coordinates,
    getRadius: 14,
    radiusUnits: 'meters',
    radiusMinPixels: 2,
    radiusMaxPixels: 6,
    getFillColor: [255, 255, 255, 230],
    getLineColor: [30, 30, 30, 255],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    parameters: { depthTest: false },
    onHover: (info) => onHover?.(info.object ?? null),
  });
}
