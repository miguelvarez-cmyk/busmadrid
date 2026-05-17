import { GeoJsonLayer } from '@deck.gl/layers';
import { hexToRgb } from '../utils/color.js';

export function createMetroCercaniasRoutesLayer({ geojson, mode, onHover }) {
  if (!geojson) return null;

  const data = {
    ...geojson,
    features: geojson.features.filter((f) => f.properties.mode === mode),
  };

  if (!data.features.length) return null;

  return new GeoJsonLayer({
    id: `metro-cercanias-routes-${mode}`,
    data,
    getLineColor: (f) => {
      const rgb = hexToRgb(f.properties.route_color);
      return [...rgb, 220];
    },
    getLineWidth: 5,
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 8,
    pickable: true,
    parameters: { depthTest: false },
    onHover: (info) => onHover?.(info.object ?? null),
    updateTriggers: { getLineColor: [] },
  });
}
