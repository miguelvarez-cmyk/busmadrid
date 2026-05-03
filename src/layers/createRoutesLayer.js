import { GeoJsonLayer } from '@deck.gl/layers';
import { hexToRgb } from '../utils/color.js';

export function createRoutesLayer({ geojson, selectedRouteIds }) {
  if (!geojson) return null;

  const filtered = selectedRouteIds.size
    ? {
        type: 'FeatureCollection',
        features: geojson.features.filter((f) =>
          selectedRouteIds.has(f.properties.route_id)
        ),
      }
    : geojson;

  return new GeoJsonLayer({
    id: 'routes',
    data: filtered,
    lineWidthUnits: 'pixels',
    getLineWidth: 2,
    getLineColor: (f) => [...hexToRgb(f.properties.route_color), 220],
    pickable: true,
    parameters: { depthTest: false },
    updateTriggers: {
      getLineColor: filtered.features.length,
    },
  });
}
