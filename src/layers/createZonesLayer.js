import { GeoJsonLayer } from '@deck.gl/layers';

export function createZonesLayer({ geojson, highlightedZoneIds }) {
  if (!geojson || !highlightedZoneIds || highlightedZoneIds.size === 0) return null;

  const features = geojson.features.filter((f) =>
    highlightedZoneIds.has(String(f.properties.cod_bar))
  );
  if (features.length === 0) return null;

  return new GeoJsonLayer({
    id: 'zones-highlight',
    data: { type: 'FeatureCollection', features },
    filled: true,
    stroked: true,
    getFillColor: [255, 255, 255, 65],
    getLineColor: [255, 255, 255, 210],
    lineWidthMinPixels: 2,
    parameters: { depthTest: false },
  });
}
