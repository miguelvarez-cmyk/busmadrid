import { GeoJsonLayer } from '@deck.gl/layers';

const PARKING_COLOR = [80, 160, 220, 200];

export function createParkingBandsLayer({ geojson, visibleRouteIds, visible }) {
  if (!geojson || !visible || !visibleRouteIds) return null;

  const filtered = {
    type: 'FeatureCollection',
    features: geojson.features.filter((f) => {
      const { side, route_ids } = f.properties;
      if (side === 'left') return false;
      return Array.isArray(route_ids) && route_ids.some((id) => visibleRouteIds.has(id));
    }),
  };

  if (!filtered.features.length) return null;

  return new GeoJsonLayer({
    id: 'parking-bands',
    data: filtered,
    stroked: true,
    filled: false,
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 1,
    getLineWidth: 2,
    getLineColor: PARKING_COLOR,
    pickable: false,
    parameters: { depthTest: false },
  });
}
