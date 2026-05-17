import { GeoJsonLayer } from '@deck.gl/layers';
import { hexToRgb } from '../utils/color.js';
import {
  frequencyColorForRoute,
  speedColorForRoute,
  demandColorForRoute,
  fleetColorForRoute,
  tortuosityColorForRoute,
  scheduleColorForRoute,
  coverageColorForRoute,
  passesFrequencyFilter,
  passesSpeedFilter,
  passesDemandFilter,
  passesFleetFilter,
  passesTortuosityFilter,
  passesScheduleFilter,
  passesCoverageFilter,
} from '../utils/service.js';

/**
 * Aplica filtros de modo (frecuencia/velocidad) sobre un set base de ids.
 * Devuelve el subset que pasa el filtro activo.
 */
export function applyModeFilter({
  routeIds,
  colorMode,
  serviceMetrics,
  routeSpeed,
  routeDemand,
  routeFleet,
  routeTortuosity,
  routeSchedule,
  occupancyData,
  routeCoverage,
  timeFilter,
  freqFilter,
  speedFilter,
  demandFilter,
  fleetFilter,
  fleetDayType,
  tortuosityFilter,
  scheduleFilter,
  scheduleDayType,
  occupancyFilter,
  coverageFilter,
  coverageDistance,
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
  if (colorMode === 'tortuosity' && routeTortuosity && tortuosityFilter) {
    const out = new Set();
    for (const id of routeIds) {
      if (passesTortuosityFilter(routeTortuosity, id, tortuosityFilter)) out.add(id);
    }
    return out;
  }
  if (colorMode === 'schedule' && routeSchedule && scheduleFilter) {
    const out = new Set();
    for (const id of routeIds) {
      if (passesScheduleFilter(routeSchedule, id, scheduleDayType, scheduleFilter)) out.add(id);
    }
    return out;
  }
  if (colorMode === 'occupancy' && occupancyData && occupancyFilter) {
    const out = new Set();
    for (const id of routeIds) {
      const occ = occupancyData[id] ?? 0;
      const [minOcc, maxOcc] = occupancyFilter;
      if (occ >= minOcc && occ <= maxOcc) out.add(id);
    }
    return out;
  }
  if (colorMode === 'coverage' && routeCoverage && coverageFilter) {
    const out = new Set();
    for (const id of routeIds) {
      if (passesCoverageFilter(routeCoverage, id, coverageDistance, coverageFilter)) out.add(id);
    }
    return out;
  }
  return routeIds;
}

function occupancyColorForRoute(occupancyData, routeId) {
  const occ = occupancyData?.[routeId] ?? 0;
  const maxOcc = Math.max(...Object.values(occupancyData || {}), 1);
  const t = maxOcc > 0 ? Math.min(occ / maxOcc, 1) : 0;
  let r, g, b;
  if (t < 0.5) {
    const k = t / 0.5;
    r = Math.round(50 + 170 * k);
    g = 200;
    b = 50;
  } else {
    const k = (t - 0.5) / 0.5;
    r = 220;
    g = Math.round(200 - 150 * k);
    b = 50;
  }
  return [r, g, b];
}

export function createRoutesLayer({
  geojson,
  visibleRouteIds,
  colorMode,
  serviceMetrics,
  routeSpeed,
  routeDemand,
  routeFleet,
  routeTortuosity,
  routeSchedule,
  occupancyData,
  routeCoverage,
  timeFilter,
  fleetDayType,
  scheduleDayType,
  coverageDistance,
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
  } else if (colorMode === 'tortuosity' && routeTortuosity) {
    getLineColor = (f) => [
      ...tortuosityColorForRoute(routeTortuosity, f.properties.route_id),
      230,
    ];
  } else if (colorMode === 'schedule' && routeSchedule) {
    getLineColor = (f) => [
      ...scheduleColorForRoute(routeSchedule, f.properties.route_id, scheduleDayType),
      230,
    ];
  } else if (colorMode === 'occupancy' && occupancyData) {
    getLineColor = (f) => [
      ...occupancyColorForRoute(occupancyData, f.properties.route_id),
      230,
    ];
  } else if (colorMode === 'coverage' && routeCoverage) {
    getLineColor = (f) => [
      ...coverageColorForRoute(routeCoverage, f.properties.route_id, coverageDistance),
      230,
    ];
  } else {
    getLineColor = (f) => [...hexToRgb(f.properties.route_color), 220];
  }

  return new GeoJsonLayer({
    id: 'routes',
    data: filtered,
    lineWidthUnits: 'pixels',
    getLineWidth: 3,
    getLineColor,
    pickable: true,
    autoHighlight: false,
    parameters: { depthTest: false },
    updateTriggers: {
      getLineColor: [
        colorMode,
        timeFilter.dayOfWeek,
        timeFilter.startHour,
        timeFilter.endHour,
        fleetDayType,
        scheduleDayType,
        coverageDistance,
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
    getLineWidth: 7,
    getLineColor: [...hexToRgb(feature.properties.route_color), 255],
    pickable: false,
    parameters: { depthTest: false },
  });
}
