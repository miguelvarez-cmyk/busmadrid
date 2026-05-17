import { ScatterplotLayer } from '@deck.gl/layers';
import { hexToRgb } from '../utils/color.js';

const MODE_DEFAULTS = {
  metro: '888888',
  cercanias: '4FB0E5',
};

export function createMetroCercaniasStopsLayer({ geojson, mode, routeColorMap, onHover }) {
  if (!geojson) return null;

  const data = geojson.features.filter((f) => f.properties.mode === mode);
  if (!data.length) return null;

  return new ScatterplotLayer({
    id: `metro-cercanias-stops-${mode}`,
    data,
    getPosition: (f) => f.geometry.coordinates,
    getRadius: 20,
    radiusUnits: 'meters',
    radiusMinPixels: 4,
    radiusMaxPixels: 12,
    getFillColor: (f) => {
      const routes = f.properties.routes ?? [];
      const firstMatch = routes.find((rid) => routeColorMap?.has(rid));
      const hex = firstMatch ? routeColorMap.get(firstMatch) : (MODE_DEFAULTS[mode] ?? '888888');
      return [...hexToRgb(hex), 230];
    },
    getLineColor: [255, 255, 255, 200],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    parameters: { depthTest: false },
    onHover: (info) => onHover?.(info.object ?? null),
  });
}
