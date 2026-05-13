import { GeoJsonLayer } from '@deck.gl/layers';

export function createBusLanesLayer({ geojson, visible }) {
  if (!geojson || !visible) return null;

  return new GeoJsonLayer({
    id: 'bus-lanes',
    data: geojson,
    stroked: true,
    filled: false,
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 1,
    getLineWidth: 3,
    getLineColor: [230, 120, 0, 220],
    pickable: false,
    parameters: { depthTest: false },
  });
}
