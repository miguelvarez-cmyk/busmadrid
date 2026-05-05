import { ScatterplotLayer } from '@deck.gl/layers';
import { passesStopRoutesFilter } from '../utils/service.js';

export function createStopsLayer({ geojson, visibleRouteIds, onHover, visible, stopRoutesFilter }) {
  if (!geojson || !visible) return null;

  const data = geojson.features.filter((f) => {
    const routes = f.properties.routes;
    let hasVisible = false;
    for (let i = 0; i < routes.length; i++) {
      if (visibleRouteIds.has(routes[i])) { hasVisible = true; break; }
    }
    if (!hasVisible) return false;
    if (stopRoutesFilter) return passesStopRoutesFilter(f, stopRoutesFilter);
    return true;
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
