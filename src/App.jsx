import { useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { BASEMAPS, INITIAL_VIEW_STATE } from './config/mapConfig.js';
import {
  useMapStore,
  useViewState,
  useSetViewState,
  useSelectedRouteIds,
  useHoveredRouteId,
  useHoveredRouteIds,
  useClickedRouteId,
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
  useDivergenceFilter,
  useLengthFilter,
  useScheduleFilter,
  useScheduleDayType,
  useStopRoutesFilter,
  useStopColorMode,
  useStopExpeditionsFilter,
  useOccupancyFilter,
  useCoverageFilter,
  useCoverageDistance,
  useShowBuildings,
  useHighlightedZoneIds,
  useBuildingCoverageMode,
  useShowMetroLines,
  useShowMetroStops,
  useShowBusLanes,
  useShowParkingBands,
} from './store/useMapStore.js';
import { useGTFSData } from './utils/useGTFSData.js';
import { useBuildingLineCoverage } from './utils/useBuildingLineCoverage.js';
import {
  createRoutesLayer,
  createHighlightLayer,
  applyModeFilter,
} from './layers/createRoutesLayer.js';
import { createBuildingCoverageLayer } from './layers/createBuildingCoverageLayer.js';
import { createStopsLayer } from './layers/createStopsLayer.js';
import { createZonesLayer } from './layers/createZonesLayer.js';
import { createMetroCercaniasRoutesLayer } from './layers/createMetroCercaniasRoutesLayer.js';
import { createMetroCercaniasStopsLayer } from './layers/createMetroCercaniasStopsLayer.js';
import { createBuildingsLayer } from './layers/createBuildingsLayer.js';
import { createBusLanesLayer } from './layers/createBusLanesLayer.js';
import { createParkingBandsLayer } from './layers/createParkingBandsLayer.js';
import { useBuildingsData } from './utils/useBuildingsData.js';
import { useRouteBuffers } from './utils/useRouteBuffers.js';
import BoxSelectOverlay from './components/map/BoxSelectOverlay.jsx';
import Sidebar from './components/map/Sidebar.jsx';
import RouteTooltip from './components/map/RouteTooltip.jsx';
import ColorLegend from './components/map/ColorLegend.jsx';
import RouteDrawer from './components/map/RouteDrawer.jsx';
import { LoadingScreen } from './components/map/LoadingScreen.jsx';
import { useUrlSync } from './utils/useUrlSync.js';

function ptSegDistM(lng, lat, a, b, cosLat) {
  const ax = (a[0] - lng) * 111000 * cosLat;
  const ay = (a[1] - lat) * 111000;
  const bx = (b[0] - lng) * 111000 * cosLat;
  const by = (b[1] - lat) * 111000;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) return Math.sqrt(ax * ax + ay * ay);
  const t = Math.max(0, Math.min(1, (-ax * dx - ay * dy) / lenSq));
  return Math.sqrt((ax + t * dx) ** 2 + (ay + t * dy) ** 2);
}

function nearbyRouteIds(geojson, lng, lat, radiusM, visibleRouteIds) {
  if (!geojson) return [];
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const ids = [];
  for (const f of geojson.features) {
    const id = f.properties?.route_id;
    if (!id || !visibleRouteIds.has(id)) continue;
    const lines = f.geometry.type === 'MultiLineString'
      ? f.geometry.coordinates
      : [f.geometry.coordinates];
    let found = false;
    for (const line of lines) {
      if (found) break;
      for (let i = 0; i < line.length - 1 && !found; i++) {
        if (ptSegDistM(lng, lat, line[i], line[i + 1], cosLat) <= radiusM) found = true;
      }
    }
    if (found) ids.push(id);
  }
  return ids;
}

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
  const divergenceFilter = useDivergenceFilter();
  const setDivergenceFilter = useMapStore((s) => s.setDivergenceFilter);
  const lengthFilter = useLengthFilter();
  const setLengthFilter = useMapStore((s) => s.setLengthFilter);
  const scheduleFilter = useScheduleFilter();
  const setScheduleFilter = useMapStore((s) => s.setScheduleFilter);
  const scheduleDayType = useScheduleDayType();
  const stopRoutesFilter = useStopRoutesFilter();
  const setStopRoutesFilter = useMapStore((s) => s.setStopRoutesFilter);
  const stopColorMode = useStopColorMode();
  const stopExpeditionsFilter = useStopExpeditionsFilter();
  const setStopExpeditionsFilter = useMapStore((s) => s.setStopExpeditionsFilter);
  const occupancyFilter = useOccupancyFilter();
  const setOccupancyFilter = useMapStore((s) => s.setOccupancyFilter);
  const coverageFilter = useCoverageFilter();
  const setCoverageFilter = useMapStore((s) => s.setCoverageFilter);
  const coverageDistance = useCoverageDistance();
  const showBuildings = useShowBuildings();
  const setShowBuildings = useMapStore((s) => s.setShowBuildings);
  const highlightedZoneIds = useHighlightedZoneIds();
  const clickedRouteId = useClickedRouteId();
  const setClickedRouteId = useMapStore((s) => s.setClickedRouteId);
  const buildingCoverageMode = useBuildingCoverageMode();
  const setSelectedBuilding = useMapStore((s) => s.setSelectedBuilding);
  const showMetroLines = useShowMetroLines();
  const showMetroStops = useShowMetroStops();
  const showBusLanes = useShowBusLanes();
  const showParkingBands = useShowParkingBands();

  useUrlSync();

  const routeBuffers = useRouteBuffers(showBuildings);
  const buildingFeatures = useBuildingsData(viewState, showBuildings, routeBuffers, selectedRouteIds, coverageDistance);

  const {
    routesGeojson,
    routesMeta,
    serviceMetrics,
    stopsGeojson,
    routeSpeed,
    routeDemand,
    routeFleet,
    routeTortuosity,
    routeDivergence,
    routeSchedule,
    routeDistricts,
    barriosGeojson,
    stopExpeditions,
    routeCoverage,
    metroCercaniasRoutes,
    metroCercaniasStops,
    busLanesGeojson,
    parkingBandsGeojson,
    loading,
    error,
    progress,
  } = useGTFSData();

  const [showLoader, setShowLoader] = useState(true);
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setShowLoader(false), 600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const { data: buildingLineCoverage, loading: buildingCoverageLoading } = useBuildingLineCoverage(buildingCoverageMode);

  const filteredBuildingCoverage = useMemo(() => {
    if (!buildingLineCoverage || !selectedRouteIds?.size) return buildingLineCoverage;
    return {
      ...buildingLineCoverage,
      features: buildingLineCoverage.features.filter((f) => {
        const lineas = f.properties.lineas;
        if (!lineas) return false;
        return lineas.split(',').some((id) => selectedRouteIds.has(id.trim()));
      }),
    };
  }, [buildingLineCoverage, selectedRouteIds]);

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

  // Tab / Shift+Tab cicla entre líneas superpuestas; Enter abre el drawer
  useEffect(() => {
    if (!hoveredRouteIds.length) return;
    const len = hoveredRouteIds.length;
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setHoverActiveIdx((prev) =>
          e.shiftKey ? (prev - 1 + len) % len : (prev + 1) % len
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeId = hoveredRouteIds[hoverActiveIdx];
        if (activeId) {
          setClickedRouteId(activeId);
          setHoveredRouteIds([]);
          setHoverActiveIdx(0);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hoveredRouteIds, hoverActiveIdx, setClickedRouteId, setHoveredRouteIds]);

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
    if (routeDivergence && !divergenceFilter) {
      setDivergenceFilter([0, 100]);
    }
  }, [routeDivergence, divergenceFilter, setDivergenceFilter]);

  useEffect(() => {
    if (routeTortuosity && !lengthFilter) {
      const allLengths = Object.values(routeTortuosity.byRoute).map((v) => v.lengthKm);
      const maxLen = Math.ceil(Math.max(...allLengths));
      setLengthFilter([0, maxLen]);
    }
  }, [routeTortuosity, lengthFilter, setLengthFilter]);

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
      }),
    [
      selectedRouteIds,
      colorMode,
      serviceMetrics,
      routeSpeed,
      routeDemand,
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
    ]
  );

  const metroCercaniasRouteColorMap = useMemo(() => {
    const map = new Map();
    if (!metroCercaniasRoutes) return map;
    for (const f of metroCercaniasRoutes.features) {
      map.set(f.properties.route_id, f.properties.route_color);
    }
    return map;
  }, [metroCercaniasRoutes]);

  const layers = useMemo(
    () =>
      [
        showMetroLines && createMetroCercaniasRoutesLayer({ geojson: metroCercaniasRoutes, mode: 'metro' }),
        showMetroStops && createMetroCercaniasStopsLayer({ geojson: metroCercaniasStops, mode: 'metro', routeColorMap: metroCercaniasRouteColorMap, onHover: setHoveredStop }),
        createBuildingsLayer({ features: buildingFeatures }),
        createBusLanesLayer({ geojson: busLanesGeojson, visible: showBusLanes }),
        createParkingBandsLayer({ geojson: parkingBandsGeojson, visibleRouteIds, visible: showParkingBands }),
        !buildingCoverageMode && createRoutesLayer({
          geojson: routesGeojson,
          visibleRouteIds,
          colorMode,
          serviceMetrics,
          routeSpeed,
          routeDemand,
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
          hoveredRouteIds,
          clickedRouteId,
        }),
        !buildingCoverageMode && createHighlightLayer({ geojson: routesGeojson, hoveredRouteId }),
        !buildingCoverageMode && createStopsLayer({
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
        buildingCoverageMode && createBuildingCoverageLayer({
          geojson: filteredBuildingCoverage,
          onClickBuilding: (feat) => setSelectedBuilding(feat?.properties ?? null),
        }),
      ].filter(Boolean),
    [
      routesGeojson,
      visibleRouteIds,
      hoveredRouteId,
      hoveredRouteIds,
      clickedRouteId,
      colorMode,
      serviceMetrics,
      routeSpeed,
      routeDemand,
      routeFleet,
      routeTortuosity,
      routeDivergence,
      routeSchedule,
      occupancyData,
      routeCoverage,
      coverageDistance,
      buildingFeatures,
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
      buildingCoverageMode,
      filteredBuildingCoverage,
      setSelectedBuilding,
      showMetroLines,
      showMetroStops,
      metroCercaniasRoutes,
      metroCercaniasStops,
      metroCercaniasRouteColorMap,
      busLanesGeojson,
      showBusLanes,
      parkingBandsGeojson,
      showParkingBands,
    ]
  );


  function handleReset() {
    setViewState({ ...INITIAL_VIEW_STATE, transitionDuration: 600 });
    if (routesMeta) selectAllRoutes(routesMeta.map((r) => r.id));
    setClickedRouteId(null);
  }

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
          if (info.layer?.id === 'building-coverage') return;
          setClickedRouteId(info.object?.properties?.route_id ?? null);
        }}
        onHover={(info) => {
          clearTimeout(hoverTimeoutRef.current);
          if (!info.coordinate) {
            hoverTimeoutRef.current = setTimeout(() => {
              if (!isTooltipHoveredRef.current) {
                setHoveredRouteIds([]);
                setHoverActiveIdx(0);
              }
            }, 200);
            return;
          }
          const [lng, lat] = info.coordinate;
          const ids = nearbyRouteIds(routesGeojson, lng, lat, 150, visibleRouteIds);
          if (ids.length) {
            const changed = hoveredRouteIds.length !== ids.length || hoveredRouteIds.some((id, i) => id !== ids[i]);
            setHoveredRouteIds(ids);
            if (changed) setHoverActiveIdx(0);
          } else {
            hoverTimeoutRef.current = setTimeout(() => {
              if (!isTooltipHoveredRef.current) {
                setHoveredRouteIds([]);
                setHoverActiveIdx(0);
              }
            }, 200);
          }
        }}
      >
        <MapGL mapStyle={BASEMAPS[basemap].style} reuseMaps={false} />
      </DeckGL>

      <BoxSelectOverlay viewState={viewState} geojson={routesGeojson} />

      <Sidebar
        routesMeta={routesMeta}
        routeSpeed={routeSpeed}
        routeDemand={routeDemand}
        routeFleet={routeFleet}
        routeTortuosity={routeTortuosity}
        routeDivergence={routeDivergence}
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
        buildingLineCoverage={buildingLineCoverage}
        buildingCoverageLoading={buildingCoverageLoading}
        metroCercaniasRoutes={metroCercaniasRoutes}
        metroCercaniasStops={metroCercaniasStops}
        showBuildings={showBuildings}
        setShowBuildings={setShowBuildings}
        busLanesGeojson={busLanesGeojson}
        parkingBandsGeojson={parkingBandsGeojson}
        isLoading={loading}
        onReset={handleReset}
      />

      <RouteTooltip
        activeRouteId={hoveredRouteIds[hoverActiveIdx]}
        candidateIds={hoveredRouteIds}
        activeIdx={hoverActiveIdx}
        onActiveIdxChange={setHoverActiveIdx}
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

{showLoader && <LoadingScreen loading={loading} progress={progress} />}
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
