import { GeoJsonLayer } from '@deck.gl/layers';
import { hexToRgb } from '../utils/color.js';
import {
  frequencyColorForRoute,
  speedColorForRoute,
  demandColorForRoute,
  fleetColorForRoute,
  tortuosityColorForRoute,
  divergenceColorForRoute,
  lengthColorForRoute,
  scheduleColorForRoute,
  coverageColorForRoute,
  passesFrequencyFilter,
  passesSpeedFilter,
  passesDemandFilter,
  passesFleetFilter,
  passesTortuosityFilter,
  passesDivergenceFilter,
  passesLengthFilter,
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
  demandYear,
  routeFleet,
  routeTortuosity,
  routeDivergence,
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
  divergenceFilter,
  lengthFilter,
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
      if (passesDemandFilter(routeDemand, id, demandFilter, demandYear)) out.add(id);
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
  if (colorMode === 'divergence' && routeDivergence && divergenceFilter) {
    const out = new Set();
    for (const id of routeIds) {
      if (passesDivergenceFilter(routeDivergence, id, divergenceFilter)) out.add(id);
    }
    return out;
  }
  if (colorMode === 'length' && routeTortuosity && lengthFilter) {
    const out = new Set();
    for (const id of routeIds) {
      if (passesLengthFilter(routeTortuosity, id, lengthFilter)) out.add(id);
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
  demandYear,
  routeFleet,
  routeTortuosity,
  routeDivergence,
  routeSchedule,
  occupancyData,
  routeCoverage,
  coverageDistance,
  timeFilter,
  fleetDayType,
  scheduleDayType,
  hoveredRouteIds = [],
  clickedRouteId = null,
}) {
  if (!geojson) return null;

  const filtered = {
    type: 'FeatureCollection',
    features: geojson.features.filter((f) =>
      visibleRouteIds.has(f.properties.route_id)
    ),
  };

  const hoveredSet = new Set(hoveredRouteIds);

  function getAlpha(routeId) {
    if (clickedRouteId) {
      return routeId === clickedRouteId ? 255 : 25;
    }
    if (hoveredSet.size > 0) {
      return hoveredSet.has(routeId) ? 217 : 38;
    }
    return 89;
  }

  function getWidth(routeId) {
    if (clickedRouteId) {
      return routeId === clickedRouteId ? 4.0 : 1.5;
    }
    if (hoveredSet.size > 0) {
      return hoveredSet.has(routeId) ? 3.5 : 1.5;
    }
    return 2.0;
  }

  let getBaseColor;
  if (colorMode === 'offer' && serviceMetrics) {
    getBaseColor = (f) => frequencyColorForRoute(
      serviceMetrics,
      f.properties.route_id,
      timeFilter.dayOfWeek,
      timeFilter.startHour,
      timeFilter.endHour
    );
  } else if (colorMode === 'speed' && routeSpeed) {
    getBaseColor = (f) => speedColorForRoute(routeSpeed, f.properties.route_id);
  } else if (colorMode === 'demand' && routeDemand) {
    getBaseColor = (f) => demandColorForRoute(routeDemand, f.properties.route_id, demandYear);
  } else if (colorMode === 'fleet' && routeFleet) {
    getBaseColor = (f) => fleetColorForRoute(routeFleet, f.properties.route_id, fleetDayType);
  } else if (colorMode === 'tortuosity' && routeTortuosity) {
    getBaseColor = (f) => tortuosityColorForRoute(routeTortuosity, f.properties.route_id);
  } else if (colorMode === 'divergence' && routeDivergence) {
    getBaseColor = (f) => divergenceColorForRoute(routeDivergence, f.properties.route_id);
  } else if (colorMode === 'length' && routeTortuosity) {
    getBaseColor = (f) => lengthColorForRoute(routeTortuosity, f.properties.route_id);
  } else if (colorMode === 'schedule' && routeSchedule) {
    getBaseColor = (f) => scheduleColorForRoute(routeSchedule, f.properties.route_id, scheduleDayType);
  } else if (colorMode === 'occupancy' && occupancyData) {
    getBaseColor = (f) => occupancyColorForRoute(occupancyData, f.properties.route_id);
  } else if (colorMode === 'coverage' && routeCoverage) {
    getBaseColor = (f) => coverageColorForRoute(routeCoverage, f.properties.route_id, coverageDistance);
  } else {
    getBaseColor = (f) => hexToRgb(f.properties.route_color);
  }

  const getLineColor = (f) => [...getBaseColor(f), getAlpha(f.properties.route_id)];
  const getLineWidth = (f) => getWidth(f.properties.route_id);

  return new GeoJsonLayer({
    id: 'routes',
    data: filtered,
    lineWidthUnits: 'pixels',
    getLineWidth,
    getLineColor,
    pickable: true,
    autoHighlight: false,
    parameters: { depthTest: false },
    updateTriggers: {
      getLineColor: [
        colorMode,
        demandYear,
        timeFilter.dayOfWeek,
        timeFilter.startHour,
        timeFilter.endHour,
        fleetDayType,
        scheduleDayType,
        coverageDistance,
        hoveredRouteIds,
        clickedRouteId,
      ],
      getLineWidth: [hoveredRouteIds, clickedRouteId],
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
    getLineColor: [100, 180, 255, 255],
    pickable: false,
    parameters: { depthTest: false },
  });
}
