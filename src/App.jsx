import { useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { BASEMAPS } from './config/mapConfig.js';
import {
  useMapStore,
  useViewState,
  useSetViewState,
  useSelectedRouteIds,
  useHoveredRouteId,
  useColorMode,
  useTimeFilter,
  useBoxSelectMode,
  useShowStops,
  useHoveredStop,
  useBasemap,
  useFreqFilter,
  useSpeedFilter,
  useDemandFilter,
  useFleetFilter,
  useFleetDayType,
  useTortuosityFilter,
  useScheduleFilter,
  useScheduleDayType,
  useStopRoutesFilter,
} from './store/useMapStore.js';
import { useGTFSData } from './utils/useGTFSData.js';
import {
  createRoutesLayer,
  createHighlightLayer,
  applyModeFilter,
} from './layers/createRoutesLayer.js';
import { createStopsLayer } from './layers/createStopsLayer.js';
import { bestFrequencyMinutes, fleetForRoute, tortuosityForRoute, scheduleSpanForRoute, formatSpanMinutes } from './utils/service.js';
import BoxSelectOverlay from './components/map/BoxSelectOverlay.jsx';
import Sidebar from './components/map/Sidebar.jsx';

export default function App() {
  const viewState = useViewState();
  const setViewState = useSetViewState();
  const selectedRouteIds = useSelectedRouteIds();
  const hoveredRouteId = useHoveredRouteId();
  const setHoveredRouteId = useMapStore((s) => s.setHoveredRouteId);
  const selectAllRoutes = useMapStore((s) => s.selectAllRoutes);
  const colorMode = useColorMode();
  const timeFilter = useTimeFilter();
  const boxSelectMode = useBoxSelectMode();
  const showStops = useShowStops();
  const setShowStops = useMapStore((s) => s.setShowStops);
  const hoveredStop = useHoveredStop();
  const setHoveredStop = useMapStore((s) => s.setHoveredStop);
  const basemap = useBasemap();
  const setBasemap = useMapStore((s) => s.setBasemap);
  const freqFilter = useFreqFilter();
  const speedFilter = useSpeedFilter();
  const setSpeedFilter = useMapStore((s) => s.setSpeedFilter);
  const demandFilter = useDemandFilter();
  const setDemandFilter = useMapStore((s) => s.setDemandFilter);
  const fleetFilter = useFleetFilter();
  const setFleetFilter = useMapStore((s) => s.setFleetFilter);
  const fleetDayType = useFleetDayType();
  const tortuosityFilter = useTortuosityFilter();
  const setTortuosityFilter = useMapStore((s) => s.setTortuosityFilter);
  const scheduleFilter = useScheduleFilter();
  const setScheduleFilter = useMapStore((s) => s.setScheduleFilter);
  const scheduleDayType = useScheduleDayType();
  const stopRoutesFilter = useStopRoutesFilter();
  const setStopRoutesFilter = useMapStore((s) => s.setStopRoutesFilter);
  const {
    routesGeojson,
    routesMeta,
    serviceMetrics,
    stopsGeojson,
    routeSpeed,
    routeDemand,
    routeFleet,
    routeTortuosity,
    routeSchedule,
    loading,
    error,
  } = useGTFSData();

  useEffect(() => {
    if (routesMeta && selectedRouteIds.size === 0) {
      selectAllRoutes(routesMeta.map((r) => r.id));
    }
  }, [routesMeta, selectedRouteIds.size, selectAllRoutes]);

  useEffect(() => {
    if (routeSpeed && !speedFilter) {
      setSpeedFilter([Math.floor(routeSpeed.min), Math.ceil(routeSpeed.max)]);
    }
  }, [routeSpeed, speedFilter, setSpeedFilter]);

  useEffect(() => {
    if (routeDemand && routesMeta && !demandFilter) {
      const inGtfs = new Set(routesMeta.map((r) => r.id));
      let max = 0;
      for (const [id, entry] of Object.entries(routeDemand.byRoute)) {
        if (inGtfs.has(id) && entry.dailyAvg > max) max = entry.dailyAvg;
      }
      setDemandFilter([0, max || routeDemand.max]);
    }
  }, [routeDemand, routesMeta, demandFilter, setDemandFilter]);

  useEffect(() => {
    if (routeFleet && !fleetFilter) {
      setFleetFilter([0, routeFleet.max]);
    }
  }, [routeFleet, fleetFilter, setFleetFilter]);

  useEffect(() => {
    if (routeTortuosity && !tortuosityFilter) {
      const hi = Math.max(3, Math.ceil(routeTortuosity.max * 10) / 10);
      setTortuosityFilter([1, hi]);
    }
  }, [routeTortuosity, tortuosityFilter, setTortuosityFilter]);

  useEffect(() => {
    if (routeSchedule && !scheduleFilter) {
      setScheduleFilter([0, Math.ceil(routeSchedule.max / 60) * 60]);
    }
  }, [routeSchedule, scheduleFilter, setScheduleFilter]);

  useEffect(() => {
    if (stopsGeojson && !stopRoutesFilter) {
      let max = 1;
      for (const f of stopsGeojson.features) {
        const n = f.properties.routes?.length ?? 0;
        if (n > max) max = n;
      }
      setStopRoutesFilter([1, max]);
    }
  }, [stopsGeojson, stopRoutesFilter, setStopRoutesFilter]);

  const visibleRouteIds = useMemo(
    () =>
      applyModeFilter({
        routeIds: selectedRouteIds,
        colorMode,
        serviceMetrics,
        routeSpeed,
        routeDemand,
        routeFleet,
        routeTortuosity,
        routeSchedule,
        timeFilter,
        freqFilter,
        speedFilter,
        demandFilter,
        fleetFilter,
        fleetDayType,
        tortuosityFilter,
        scheduleFilter,
        scheduleDayType,
      }),
    [
      selectedRouteIds,
      colorMode,
      serviceMetrics,
      routeSpeed,
      routeDemand,
      routeFleet,
      routeTortuosity,
      routeSchedule,
      timeFilter,
      freqFilter,
      speedFilter,
      demandFilter,
      fleetFilter,
      fleetDayType,
      tortuosityFilter,
      scheduleFilter,
      scheduleDayType,
    ]
  );

  const layers = useMemo(
    () =>
      [
        createRoutesLayer({
          geojson: routesGeojson,
          visibleRouteIds,
          onHover: setHoveredRouteId,
          colorMode,
          serviceMetrics,
          routeSpeed,
          routeDemand,
          routeFleet,
          routeTortuosity,
          routeSchedule,
          timeFilter,
          fleetDayType,
          scheduleDayType,
        }),
        createHighlightLayer({ geojson: routesGeojson, hoveredRouteId }),
        createStopsLayer({
          geojson: stopsGeojson,
          visibleRouteIds,
          visible: showStops,
          onHover: setHoveredStop,
          stopRoutesFilter,
        }),
      ].filter(Boolean),
    [
      routesGeojson,
      visibleRouteIds,
      hoveredRouteId,
      setHoveredRouteId,
      colorMode,
      serviceMetrics,
      routeSpeed,
      routeDemand,
      routeFleet,
      routeTortuosity,
      routeSchedule,
      timeFilter,
      fleetDayType,
      scheduleDayType,
      stopsGeojson,
      showStops,
      setHoveredStop,
      stopRoutesFilter,
    ]
  );

  const hoveredFeature = useMemo(() => {
    if (!hoveredRouteId || !routesGeojson) return null;
    return routesGeojson.features.find(
      (f) => f.properties.route_id === hoveredRouteId
    );
  }, [hoveredRouteId, routesGeojson]);

  const hoveredFreqMin = useMemo(() => {
    if (!hoveredFeature || colorMode !== 'offer' || !serviceMetrics) return null;
    return bestFrequencyMinutes(
      serviceMetrics,
      hoveredFeature.properties.route_id,
      timeFilter.dayOfWeek,
      timeFilter.startHour,
      timeFilter.endHour
    );
  }, [hoveredFeature, colorMode, serviceMetrics, timeFilter]);

  const hoveredSpeed = useMemo(() => {
    if (!hoveredFeature || colorMode !== 'speed' || !routeSpeed) return null;
    return routeSpeed.byRoute[hoveredFeature.properties.route_id] ?? null;
  }, [hoveredFeature, colorMode, routeSpeed]);

  const hoveredDemand = useMemo(() => {
    if (!hoveredFeature || colorMode !== 'demand' || !routeDemand) return null;
    return routeDemand.byRoute[hoveredFeature.properties.route_id] ?? null;
  }, [hoveredFeature, colorMode, routeDemand]);

  const hoveredFleet = useMemo(() => {
    if (!hoveredFeature || colorMode !== 'fleet' || !routeFleet) return null;
    return fleetForRoute(routeFleet, hoveredFeature.properties.route_id, fleetDayType);
  }, [hoveredFeature, colorMode, routeFleet, fleetDayType]);

  const hoveredTortuosity = useMemo(() => {
    if (!hoveredFeature || colorMode !== 'tortuosity' || !routeTortuosity) return null;
    return tortuosityForRoute(routeTortuosity, hoveredFeature.properties.route_id);
  }, [hoveredFeature, colorMode, routeTortuosity]);

  const hoveredSchedule = useMemo(() => {
    if (!hoveredFeature || colorMode !== 'schedule' || !routeSchedule) return null;
    return scheduleSpanForRoute(routeSchedule, hoveredFeature.properties.route_id, scheduleDayType);
  }, [hoveredFeature, colorMode, routeSchedule, scheduleDayType]);

  return (
    <div className="app">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => setViewState(next)}
        controller={
          boxSelectMode
            ? false
            : {
                dragRotate: false,
                touchRotate: false,
                inertia: true,
                scrollZoom: { smooth: true },
              }
        }
        layers={layers}
        glOptions={{ powerPreference: 'high-performance' }}
      >
        <Map mapStyle={BASEMAPS[basemap].style} reuseMaps={false} />
      </DeckGL>

      <BoxSelectOverlay viewState={viewState} geojson={routesGeojson} />

      <Sidebar
        routesMeta={routesMeta}
        routeSpeed={routeSpeed}
        routeDemand={routeDemand}
        routeFleet={routeFleet}
        routeTortuosity={routeTortuosity}
        routeSchedule={routeSchedule}
        serviceMetrics={serviceMetrics}
        selectedRouteIds={selectedRouteIds}
        visibleRouteIds={visibleRouteIds}
        basemap={basemap}
        setBasemap={setBasemap}
        showStops={showStops}
        setShowStops={setShowStops}
        stopsGeojson={stopsGeojson}
      />

      {hoveredFeature && (
        <div className="hover-info">
          <span
            className="swatch"
            style={{ background: `#${hoveredFeature.properties.route_color}` }}
          />
          <b>Línea {hoveredFeature.properties.route_short_name}</b>
          <span className="long">{hoveredFeature.properties.route_long_name}</span>
          {hoveredFreqMin !== null && (
            <span className="offer">
              {isFinite(hoveredFreqMin)
                ? `cada ${hoveredFreqMin.toFixed(1)} min`
                : 'no opera'}
            </span>
          )}
          {hoveredSpeed && (
            <span className="offer">{hoveredSpeed.speedKmh.toFixed(1)} km/h</span>
          )}
          {hoveredDemand && (
            <span className="offer">
              {hoveredDemand.dailyAvg.toLocaleString('es-ES')} viajeros/día
            </span>
          )}
          {hoveredFleet != null && (
            <span className="offer">{hoveredFleet} buses ({fleetDayType})</span>
          )}
          {hoveredTortuosity != null && (
            <span className="offer">tortuosidad {hoveredTortuosity.toFixed(2)}</span>
          )}
          {hoveredSchedule != null && (
            <span className="offer">{formatSpanMinutes(hoveredSchedule)} de servicio ({scheduleDayType})</span>
          )}
        </div>
      )}

      {hoveredStop && (
        <div className="hover-info stop">
          <b>Parada {hoveredStop.properties.stop_code || hoveredStop.properties.stop_id}</b>
          <span className="long">{hoveredStop.properties.stop_name}</span>
          <span className="offer">{hoveredStop.properties.routes.length} líneas</span>
        </div>
      )}

      {loading && <div className="status-overlay">Cargando datos GTFS...</div>}
      {error && (
        <div className="status-overlay error">
          Error cargando datos: {error.message}
          <br />
          <small>¿Has ejecutado <code>python scripts/process_gtfs.py</code> y <code>python scripts/compute_service.py</code>?</small>
        </div>
      )}
    </div>
  );
}
