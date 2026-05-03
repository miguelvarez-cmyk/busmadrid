import { GeoJsonLayer } from '@deck.gl/layers';
import { hexToRgb } from '../utils/color.js';
import { offerColorForRoute } from '../utils/service.js';

export function createRoutesLayer({
  geojson,
  selectedRouteIds,
  onHover,
  colorMode,
  serviceMetrics,
  timeFilter,
  offerRange,
}) {
  if (!geojson) return null;

  const filtered = {
    type: 'FeatureCollection',
    features: geojson.features.filter((f) =>
      selectedRouteIds.has(f.properties.route_id)
    ),
  };

  const getLineColor =
    colorMode === 'offer' && serviceMetrics
      ? (f) => [
          ...offerColorForRoute(
            serviceMetrics,
            f.properties.route_id,
            timeFilter.dayOfWeek,
            timeFilter.startHour,
            timeFilter.endHour,
            offerRange
          ),
          230,
        ]
      : (f) => [...hexToRgb(f.properties.route_color), 220];

  return new GeoJsonLayer({
    id: 'routes',
    data: filtered,
    lineWidthUnits: 'pixels',
    getLineWidth: 2,
    getLineColor,
    pickable: true,
    autoHighlight: false,
    parameters: { depthTest: false },
    onHover: (info) => onHover?.(info.object?.properties?.route_id ?? null),
    updateTriggers: {
      getLineColor: [
        colorMode,
        timeFilter.dayOfWeek,
        timeFilter.startHour,
        timeFilter.endHour,
        offerRange.min,
        offerRange.max,
      ],
    },
  });
}

export function createHighlightLayer({ geojson, hoveredRouteId, getLineColor }) {
  if (!geojson || !hoveredRouteId) return null;
  const feature = geojson.features.find(
    (f) => f.properties.route_id === hoveredRouteId
  );
  if (!feature) return null;

  const baseColor = getLineColor
    ? getLineColor(feature)
    : [...hexToRgb(feature.properties.route_color), 255];

  return new GeoJsonLayer({
    id: 'routes-highlight',
    data: { type: 'FeatureCollection', features: [feature] },
    lineWidthUnits: 'pixels',
    getLineWidth: 6,
    getLineColor: [baseColor[0], baseColor[1], baseColor[2], 255],
    pickable: false,
    parameters: { depthTest: false },
  });
}
