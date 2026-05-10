import { useEffect, useMemo, useRef, useState } from 'react';
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
  useHoveredRouteIds,
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
  useStopColorMode,
  useStopExpeditionsFilter,
  useOccupancyFilter,
  useHighlightedZoneIds,
} from './store/useMapStore.js';
import { useGTFSData } from './utils/useGTFSData.js';
import {
  createRoutesLayer,
  createHighlightLayer,
  applyModeFilter,
} from './layers/createRoutesLayer.js';
import { createStopsLayer } from './layers/createStopsLayer.js';
import { createZonesLayer } from './layers/createZonesLayer.js';
import BoxSelectOverlay from './components/map/BoxSelectOverlay.jsx';
import Sidebar from './components/map/Sidebar.jsx';
import RouteTooltip from './components/map/RouteTooltip.jsx';

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
  const hoveredRouteIds = useHoveredRouteIds();
  const setHoveredRouteIds = useMapStore((s) => s.setHoveredRouteIds);
  const [hoverActiveIdx, setHoverActiveIdx] = useState(0);
  const deckRef = useRef(null);
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
  const stopColorMode = useStopColorMode();
  const setStopColorMode = useMapStore((s) => s.setStopColorMode);
  const stopExpeditionsFilter = useStopExpeditionsFilter();
  const setStopExpeditionsFilter = useMapStore((s) => s.setStopExpeditionsFilter);
  const occupancyFilter = useOccupancyFilter();
  const setOccupancyFilter = useMapStore((s) => s.setOccupancyFilter);
  const highlightedZoneIds = useHighlightedZoneIds();
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
    routeDistricts,
    barriosGeojson,
    stopExpeditions,
    loading,
    error,
  } = useGTFSData();

  const didInitRoutes = useRef(false);
  useEffect(() => {
    if (routesMeta && !didInitRoutes.current) {
      didInitRoutes.current = true;
      selectAllRoutes(routesMeta.map((r) => r.id));
    }
  }, [routesMeta, selectAllRoutes]);

  // Sincronizar hoveredRouteId con el índice activo en hoveredRouteIds
  useEffect(() => {
    const activeId = hoveredRouteIds[hoverActiveIdx] ?? null;
    if (activeId !== hoveredRouteId) {
      setHoveredRouteId(activeId);
    }
  }, [hoveredRouteIds, hoverActiveIdx, hoveredRouteId, setHoveredRouteId]);

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

  useEffect(() => {
    if (stopExpeditions?.byStop && !stopExpeditionsFilter) {
      const peaks = Object.values(stopExpeditions.byStop).map((s) => s.peak);
      const maxPeak = peaks.length > 0 ? Math.max(...peaks) : 100;
      setStopExpeditionsFilter([0, maxPeak]);
    }
  }, [stopExpeditions, stopExpeditionsFilter, setStopExpeditionsFilter]);

  // Ocupación media = viajeros/día ÷ expediciones/día
  const occupancyData = useMemo(() => {
    if (!serviceMetrics?.byRoute || !routeDemand?.byRoute) return {};
    const result = {};
    for (const [route_id, demand] of Object.entries(routeDemand.byRoute)) {
      const dailyAvg = demand.dailyAvg ?? 0;
      const m = serviceMetrics.byRoute[route_id];
      let totalTrips = 0;
      if (m?.["1"]) {
        for (const dir of ["0", "1"]) {
          const hrs = m["1"][dir];
          if (Array.isArray(hrs)) totalTrips += hrs.reduce((a, b) => a + b, 0);
        }
      }
      result[route_id] = totalTrips > 0 ? dailyAvg / totalTrips : 0;
    }
    return result;
  }, [serviceMetrics, routeDemand]);

  useEffect(() => {
    if (occupancyData && Object.keys(occupancyData).length > 0 && !occupancyFilter) {
      const values = Object.values(occupancyData);
      const maxOcc = Math.max(...values);
      setOccupancyFilter([0, maxOcc]);
    }
  }, [occupancyData, occupancyFilter, setOccupancyFilter]);

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
        occupancyData,
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
      occupancyData,
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
    ]
  );

  const layers = useMemo(
    () =>
      [
        createRoutesLayer({
          geojson: routesGeojson,
          visibleRouteIds,
          colorMode,
          serviceMetrics,
          routeSpeed,
          routeDemand,
          routeFleet,
          routeTortuosity,
          routeSchedule,
          occupancyData,
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
          stopColorMode,
          stopExpeditions,
          stopExpeditionsFilter,
        }),
        createZonesLayer({ geojson: barriosGeojson, highlightedZoneIds }),
      ].filter(Boolean),
    [
      routesGeojson,
      visibleRouteIds,
      hoveredRouteId,
      colorMode,
      serviceMetrics,
      routeSpeed,
      routeDemand,
      routeFleet,
      routeTortuosity,
      routeSchedule,
      occupancyData,
      timeFilter,
      fleetDayType,
      scheduleDayType,
      stopsGeojson,
      showStops,
      setHoveredStop,
      stopRoutesFilter,
      stopColorMode,
      stopExpeditions,
      stopExpeditionsFilter,
      barriosGeojson,
      highlightedZoneIds,
    ]
  );


  return (
    <div className="app">
      <DeckGL
        ref={deckRef}
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
        glOptions={{ powerPreference: 'default' }}
        onHover={(info) => {
          if (!info.object?.properties?.route_id) {
            setHoveredRouteIds([]);
            setHoverActiveIdx(0);
            return;
          }
          const picks = deckRef.current?.pickObjects({ x: info.x, y: info.y, radius: 60 }) ?? [];
          const routeIds = [...new Set(
            picks
              .map((p) => p.object?.properties?.route_id)
              .filter((id) => id && visibleRouteIds.has(id))
          )];
          const newRouteIds = routeIds.length ? routeIds : [info.object.properties.route_id];
          setHoveredRouteIds(newRouteIds);
          setHoverActiveIdx(0);
        }}
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
        routeDistricts={routeDistricts}
        serviceMetrics={serviceMetrics}
        selectedRouteIds={selectedRouteIds}
        visibleRouteIds={visibleRouteIds}
        basemap={basemap}
        setBasemap={setBasemap}
        showStops={showStops}
        setShowStops={setShowStops}
        stopsGeojson={stopsGeojson}
        stopExpeditions={stopExpeditions}
        occupancyData={occupancyData}
      />

      <RouteTooltip
        activeRouteId={hoveredRouteIds[hoverActiveIdx]}
        candidateIds={hoveredRouteIds}
        activeIdx={hoverActiveIdx}
        onSelectIdx={setHoverActiveIdx}
        routesMeta={routesMeta}
        routeSpeed={routeSpeed}
        routeDemand={routeDemand}
        serviceMetrics={serviceMetrics}
        dayOfWeek={timeFilter.dayOfWeek}
      />

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
