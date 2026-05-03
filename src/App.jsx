import { useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { BASEMAPS, BASEMAP_ORDER } from './config/mapConfig.js';
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
} from './store/useMapStore.js';
import { useGTFSData } from './utils/useGTFSData.js';
import {
  createRoutesLayer,
  createHighlightLayer,
  applyModeFilter,
} from './layers/createRoutesLayer.js';
import { createStopsLayer } from './layers/createStopsLayer.js';
import { bestFrequencyMinutes } from './utils/service.js';
import LineSelector from './components/map/LineSelector.jsx';
import VisualizationControls from './components/map/VisualizationControls.jsx';
import BoxSelectOverlay from './components/map/BoxSelectOverlay.jsx';

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
  const {
    routesGeojson,
    routesMeta,
    serviceMetrics,
    stopsGeojson,
    routeSpeed,
    routeDemand,
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
    if (routeDemand && !demandFilter) {
      setDemandFilter([0, routeDemand.max]);
    }
  }, [routeDemand, demandFilter, setDemandFilter]);

  const visibleRouteIds = useMemo(
    () =>
      applyModeFilter({
        routeIds: selectedRouteIds,
        colorMode,
        serviceMetrics,
        routeSpeed,
        routeDemand,
        timeFilter,
        freqFilter,
        speedFilter,
        demandFilter,
      }),
    [
      selectedRouteIds,
      colorMode,
      serviceMetrics,
      routeSpeed,
      routeDemand,
      timeFilter,
      freqFilter,
      speedFilter,
      demandFilter,
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
          timeFilter,
        }),
        createHighlightLayer({ geojson: routesGeojson, hoveredRouteId }),
        createStopsLayer({
          geojson: stopsGeojson,
          visibleRouteIds,
          visible: showStops,
          onHover: setHoveredStop,
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
      timeFilter,
      stopsGeojson,
      showStops,
      setHoveredStop,
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

  return (
    <div className="app">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => setViewState(next)}
        controller={!boxSelectMode}
        layers={layers}
      >
        <Map mapStyle={BASEMAPS[basemap].style} reuseMaps={false} />
      </DeckGL>

      <BoxSelectOverlay viewState={viewState} geojson={routesGeojson} />

      {routesMeta && <LineSelector routesMeta={routesMeta} />}
      {(serviceMetrics || routeSpeed || routeDemand) && (
        <VisualizationControls
          routeSpeed={routeSpeed}
          routeDemand={routeDemand}
          serviceMetrics={serviceMetrics}
          selectedRouteIds={selectedRouteIds}
          visibleRouteIds={visibleRouteIds}
        />
      )}

      <div className={`layer-toggles ${basemap === 'satellite' ? 'on-dark' : ''}`}>
        <div className="basemap-switch" role="radiogroup" aria-label="Mapa base">
          {BASEMAP_ORDER.map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={basemap === id}
              className={basemap === id ? 'active' : ''}
              onClick={() => setBasemap(id)}
            >
              {BASEMAPS[id].label}
            </button>
          ))}
        </div>
        <label>
          <input
            type="checkbox"
            checked={showStops}
            onChange={(e) => setShowStops(e.target.checked)}
            disabled={!stopsGeojson}
          />
          <span>Mostrar paradas</span>
          {stopsGeojson && (
            <span className="muted"> ({stopsGeojson.features.length})</span>
          )}
        </label>
      </div>

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
