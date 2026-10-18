import { ScatterplotLayer } from '@deck.gl/layers';
import { passesStopRoutesFilter, gradientColor } from '../utils/service.js';


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

  // Sin líneas visibles (p. ej. "Ocultar líneas") se muestran todas las paradas
  const filterByRoutes = visibleRouteIds.size > 0;

  const data = geojson.features.filter((f) => {
    if (filterByRoutes) {
      const routes = f.properties.routes;
      let hasVisible = false;
      for (let i = 0; i < routes.length; i++) {
        if (visibleRouteIds.has(routes[i])) { hasVisible = true; break; }
      }
      if (!hasVisible) return false;
    }

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

  // Verde = parada mejor servida (más líneas / más expediciones)
  const getFillColor = (f) => {
    const stopId = f.properties.stop_id;

    if (stopColorMode === 'routes' && stopRoutesFilter) {
      const routeCount = f.properties.routes?.length ?? 0;
      const maxRoutes = stopRoutesFilter[1];
      const t = maxRoutes > 0 ? Math.min(1, routeCount / maxRoutes) : 0;
      return [...gradientColor(1 - t), 230];
    }

    if (stopColorMode === 'expeditions' && stopExpeditionsFilter) {
      const peak = stopExpeditions?.byStop?.[stopId]?.peak ?? 0;
      const maxPeak = stopExpeditionsFilter[1];
      const t = maxPeak > 0 ? Math.min(1, peak / maxPeak) : 0;
      return [...gradientColor(1 - t), 230];
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
    radiusMinPixels: 3,
    radiusMaxPixels: 8,
    getFillColor,
    getLineColor: [30, 30, 30, 255],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    parameters: { depthTest: false },
    onHover: (info) => onHover?.(info.object ?? null),
  });
}
