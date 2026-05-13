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
  useCoverageFilter,
  useCoverageDistance,
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
import ColorLegend from './components/map/ColorLegend.jsx';
import RouteDrawer from './components/map/RouteDrawer.jsx';
import SearchBar from './components/map/SearchBar.jsx';
import { useUrlSync } from './utils/useUrlSync.js';

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
  const hoverTimeoutRef = useRef(null);
  const isTooltipHoveredRef = useRef(false);
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
  const coverageFilter = useCoverageFilter();
  const setCoverageFilter = useMapStore((s) => s.setCoverageFilter);
  const coverageDistance = useCoverageDistance();
  const highlightedZoneIds = useHighlightedZoneIds();
  const setClickedRouteId = useMapStore((s) => s.setClickedRouteId);

  useUrlSync();

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
    routeCoverage,
    loading,
    error,
  } = useGTFSData();

  const didInitRoutes = useRef(false);
  useEffect(() => {
    if (routesMeta && !didInitRoutes.current) {
      didInitRoutes.current = true;
      const urlR = new URLSearchParams(window.location.search).get('r');
      const hasUrlRoutes = urlR?.split(',').filter(Boolean).length > 0;
      if (!hasUrlRoutes) selectAllRoutes(routesMeta.map((r) => r.id));
    }
  }, [routesMeta, selectAllRoutes]);

  // Sincronizar hoveredRouteId con el índice activo en hoveredRouteIds
  useEffect(() => {
    const activeId = hoveredRouteIds[hoverActiveIdx] ?? null;
    if (activeId !== hoveredRouteId) {
      setHoveredRouteId(activeId);
    }
  }, [hoveredRouteIds, hoverActiveIdx, hoveredRouteId, setHoveredRouteId]);

  // Tab / Shift+Tab cicla entre líneas superpuestas
  useEffect(() => {
    if (hoveredRouteIds.length <= 1) return;
    const len = hoveredRouteIds.length;
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setHoverActiveIdx((prev) =>
          e.shiftKey ? (prev - 1 + len) % len : (prev + 1) % len
        );
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hoveredRouteIds.length]);

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

  useEffect(() => {
    if (routeCoverage && !coverageFilter) {
      const minKey = `min_${coverageDistance}`;
      const maxKey = `max_${coverageDistance}`;
      setCoverageFilter([routeCoverage[minKey] ?? 0, routeCoverage[maxKey] ?? 1]);
    }
  }, [routeCoverage, coverageFilter, coverageDistance, setCoverageFilter]);

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
          routeCoverage,
          coverageDistance,
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
      routeCoverage,
      coverageDistance,
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
        onClick={(info) => {
          if (boxSelectMode) return;
          setClickedRouteId(info.object?.properties?.route_id ?? null);
        }}
        onHover={(info) => {
          if (!info.object?.properties?.route_id) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = setTimeout(() => {
              if (!isTooltipHoveredRef.current) {
                setHoveredRouteIds([]);
                setHoverActiveIdx(0);
              }
            }, 200);
            return;
          }
          clearTimeout(hoverTimeoutRef.current);
          const viewport = deckRef.current?.deck?.getViewports()?.[0];
          const pixelsPerMeter = viewport?.getDistanceScales()?.pixelsPerMeter?.[0] ?? 1;
          const radiusPx = Math.max(15, Math.round(80 * pixelsPerMeter));
          const picks = deckRef.current?.pickObjects({ x: info.x, y: info.y, radius: radiusPx }) ?? [];
          const routeIds = [...new Set(
            picks
              .map((p) => p.object?.properties?.route_id)
              .filter((id) => id && visibleRouteIds.has(id))
          )];
          setHoveredRouteIds(routeIds.length ? routeIds : [info.object.properties.route_id]);
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
        routeCoverage={routeCoverage}
      />

      <RouteTooltip
        activeRouteId={hoveredRouteIds[hoverActiveIdx]}
        candidateIds={hoveredRouteIds}
        activeIdx={hoverActiveIdx}
        routesMeta={routesMeta}
        routeSpeed={routeSpeed}
        routeDemand={routeDemand}
        serviceMetrics={serviceMetrics}
        dayOfWeek={timeFilter.dayOfWeek}
        onTooltipMouseEnter={() => {
          isTooltipHoveredRef.current = true;
          clearTimeout(hoverTimeoutRef.current);
        }}
        onTooltipMouseLeave={() => {
          isTooltipHoveredRef.current = false;
          setHoveredRouteIds([]);
          setHoverActiveIdx(0);
        }}
      />

      {hoveredStop && (
        <div className="hover-info stop">
          <b>Parada {hoveredStop.properties.stop_code || hoveredStop.properties.stop_id}</b>
          <span className="long">{hoveredStop.properties.stop_name}</span>
          <span className="offer">{hoveredStop.properties.routes.length} líneas</span>
        </div>
      )}

      <ColorLegend />

      <RouteDrawer
        routesMeta={routesMeta}
        routeSpeed={routeSpeed}
        routeDemand={routeDemand}
        routeFleet={routeFleet}
        routeSchedule={routeSchedule}
        routeCoverage={routeCoverage}
        serviceMetrics={serviceMetrics}
        routesGeojson={routesGeojson}
        dayOfWeek={timeFilter.dayOfWeek}
      />

      <SearchBar stopsGeojson={stopsGeojson} />

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
