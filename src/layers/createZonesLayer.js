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
    getFillColor: [100, 160, 255, 70],
    getLineColor: [255, 255, 255, 240],
    lineWidthMinPixels: 1.5,
    parameters: { depthTest: false },
  });
}
