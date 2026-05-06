import { ScatterplotLayer } from '@deck.gl/layers';
import { passesStopRoutesFilter } from '../utils/service.js';

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

export function createStopsLayer({
  geojson,
  visibleRouteIds,
  onHover,
  visible,
  stopRoutesFilter,
  stopColorMode,
  stopExpeditions,
  stopExpeditionsFilter,
}) {
  if (!geojson || !visible) return null;

  const data = geojson.features.filter((f) => {
    const routes = f.properties.routes;
    let hasVisible = false;
    for (let i = 0; i < routes.length; i++) {
      if (visibleRouteIds.has(routes[i])) { hasVisible = true; break; }
    }
    if (!hasVisible) return false;

    // Filter by stop color mode
    if (stopColorMode === 'routes' && stopRoutesFilter) {
      if (!passesStopRoutesFilter(f, stopRoutesFilter)) return false;
    } else if (stopColorMode === 'expeditions' && stopExpeditionsFilter) {
      const stopId = f.properties.stop_id;
      const peak = stopExpeditions?.byStop?.[stopId]?.peak ?? 0;
      const [minPeak, maxPeak] = stopExpeditionsFilter;
      if (peak < minPeak || peak > maxPeak) return false;
    }
    return true;
  });

  const getFillColor = (f) => {
    const stopId = f.properties.stop_id;

    if (stopColorMode === 'routes' && stopRoutesFilter) {
      const routeCount = f.properties.routes?.length ?? 0;
      const maxRoutes = stopRoutesFilter[1];
      const t = maxRoutes > 0 ? routeCount / maxRoutes : 0;
      let r, g, b;
      if (t < 0.5) {
        const k = t / 0.5;
        r = lerp(50, 255, k);
        g = 200;
        b = 50;
      } else {
        const k = (t - 0.5) / 0.5;
        r = lerp(255, 220, k);
        g = lerp(200, 50, k);
        b = 50;
      }
      return [r, g, b, 230];
    }

    if (stopColorMode === 'expeditions' && stopExpeditionsFilter) {
      const peak = stopExpeditions?.byStop?.[stopId]?.peak ?? 0;
      const maxPeak = stopExpeditionsFilter[1];
      const t = maxPeak > 0 ? peak / maxPeak : 0;
      let r, g, b;
      if (t < 0.5) {
        const k = t / 0.5;
        r = lerp(50, 255, k);
        g = 200;
        b = 50;
      } else {
        const k = (t - 0.5) / 0.5;
        r = lerp(255, 220, k);
        g = lerp(200, 50, k);
        b = 50;
      }
      return [r, g, b, 230];
    }

    // Default white
    return [255, 255, 255, 230];
  };

  return new ScatterplotLayer({
    id: 'stops',
    data,
    getPosition: (f) => f.geometry.coordinates,
    getRadius: 14,
    radiusUnits: 'meters',
    radiusMinPixels: 2,
    radiusMaxPixels: 6,
    getFillColor,
    getLineColor: [30, 30, 30, 255],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    parameters: { depthTest: false },
    onHover: (info) => onHover?.(info.object ?? null),
  });
}
