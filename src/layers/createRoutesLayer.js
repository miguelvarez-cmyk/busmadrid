import { GeoJsonLayer } from '@deck.gl/layers';
import { hexToRgb } from '../utils/color.js';
import {
  frequencyColorForRoute,
  speedColorForRoute,
  demandColorForRoute,
  fleetColorForRoute,
  passesFrequencyFilter,
  passesSpeedFilter,
  passesDemandFilter,
  passesFleetFilter,
} from '../utils/service.js';

/**
 * Aplica filtros de modo (frecuencia/velocidad) sobre un set base de ids.
 * Devuelve el subset que pasa el filtro activo. En modo 'route' no filtra.
 */
export function applyModeFilter({
  routeIds,
  colorMode,
  serviceMetrics,
  routeSpeed,
  routeDemand,
  routeFleet,
  timeFilter,
  freqFilter,
  speedFilter,
  demandFilter,
  fleetFilter,
  fleetDayType,
}) {
  if (colorMode === 'offer' && serviceMetrics) {
    const out = new Set();
    for (const id of routeIds) {
      if (
        passesFrequencyFilter(
          serviceMetrics,
          id,
          timeFilter.dayOfWeek,
          timeFilter.startHour,
          timeFilter.endHour,
          freqFilter
        )
      ) out.add(id);
    }
    return out;
  }
  if (colorMode === 'speed' && routeSpeed && speedFilter) {
    const out = new Set();
    for (const id of routeIds) {
      if (passesSpeedFilter(routeSpeed, id, speedFilter)) out.add(id);
    }
    return out;
  }
  if (colorMode === 'demand' && routeDemand && demandFilter) {
    const out = new Set();
    for (const id of routeIds) {
      if (passesDemandFilter(routeDemand, id, demandFilter)) out.add(id);
    }
    return out;
  }
  if (colorMode === 'fleet' && routeFleet && fleetFilter) {
    const out = new Set();
    for (const id of routeIds) {
      if (passesFleetFilter(routeFleet, id, fleetDayType, fleetFilter)) out.add(id);
    }
    return out;
  }
  return routeIds;
}

export function createRoutesLayer({
  geojson,
  visibleRouteIds,
  onHover,
  colorMode,
  serviceMetrics,
  routeSpeed,
  routeDemand,
  routeFleet,
  timeFilter,
  fleetDayType,
}) {
  if (!geojson) return null;

  const filtered = {
    type: 'FeatureCollection',
    features: geojson.features.filter((f) =>
      visibleRouteIds.has(f.properties.route_id)
    ),
  };

  let getLineColor;
  if (colorMode === 'offer' && serviceMetrics) {
    getLineColor = (f) => [
      ...frequencyColorForRoute(
        serviceMetrics,
        f.properties.route_id,
        timeFilter.dayOfWeek,
        timeFilter.startHour,
        timeFilter.endHour
      ),
      230,
    ];
  } else if (colorMode === 'speed' && routeSpeed) {
    getLineColor = (f) => [
      ...speedColorForRoute(routeSpeed, f.properties.route_id),
      230,
    ];
  } else if (colorMode === 'demand' && routeDemand) {
    getLineColor = (f) => [
      ...demandColorForRoute(routeDemand, f.properties.route_id),
      230,
    ];
  } else if (colorMode === 'fleet' && routeFleet) {
    getLineColor = (f) => [
      ...fleetColorForRoute(routeFleet, f.properties.route_id, fleetDayType),
      230,
    ];
  } else {
    getLineColor = (f) => [...hexToRgb(f.properties.route_color), 220];
  }

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
        fleetDayType,
      ],
    },
  });
}

export function createHighlightLayer({ geojson, hoveredRouteId }) {
  if (!geojson || !hoveredRouteId) return null;
  const feature = geojson.features.find(
    (f) => f.properties.route_id === hoveredRouteId
  );
  if (!feature) return null;

  return new GeoJsonLayer({
    id: 'routes-highlight',
    data: { type: 'FeatureCollection', features: [feature] },
    lineWidthUnits: 'pixels',
    getLineWidth: 6,
    getLineColor: [...hexToRgb(feature.properties.route_color), 255],
    pickable: false,
    parameters: { depthTest: false },
  });
}
