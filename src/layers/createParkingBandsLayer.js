import { GeoJsonLayer } from '@deck.gl/layers';

const PARKING_COLORS = {
  'Azul':          [0,   100, 220, 200],
  'Verde':         [30,  160,  60, 200],
  'Alta Rotación': [200, 200,   0, 200],
  'Rojo':          [210,  30,  30, 200],
  'Naranja':       [230, 130,   0, 200],
};

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
    getLineColor: (f) => PARKING_COLORS[f.properties.Color] ?? [120, 120, 120, 160],
    pickable: false,
    parameters: { depthTest: false },
    updateTriggers: {
      getLineColor: [],
    },
  });
}
