import { useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { MAP_STYLE } from './config/mapConfig.js';
import {
  useMapStore,
  useViewState,
  useSetViewState,
  useSelectedRouteIds,
  useHoveredRouteId,
  useColorMode,
  useTimeFilter,
  useBoxSelectMode,
} from './store/useMapStore.js';
import { useGTFSData } from './utils/useGTFSData.js';
import { createRoutesLayer, createHighlightLayer } from './layers/createRoutesLayer.js';
import { computeOfferRange, tripsPerHour } from './utils/service.js';
import LineSelector from './components/map/LineSelector.jsx';
import OfferControls from './components/map/OfferControls.jsx';
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
  const { routesGeojson, routesMeta, serviceMetrics, loading, error } = useGTFSData();

  useEffect(() => {
    if (routesMeta && selectedRouteIds.size === 0) {
      selectAllRoutes(routesMeta.map((r) => r.id));
    }
  }, [routesMeta, selectedRouteIds.size, selectAllRoutes]);

  const offerRange = useMemo(
    () =>
      computeOfferRange(
        serviceMetrics,
        selectedRouteIds,
        timeFilter.dayOfWeek,
        timeFilter.startHour,
        timeFilter.endHour
      ),
    [serviceMetrics, selectedRouteIds, timeFilter]
  );

  const layers = useMemo(
    () =>
      [
        createRoutesLayer({
          geojson: routesGeojson,
          selectedRouteIds,
          onHover: setHoveredRouteId,
          colorMode,
          serviceMetrics,
          timeFilter,
          offerRange,
        }),
        createHighlightLayer({ geojson: routesGeojson, hoveredRouteId }),
      ].filter(Boolean),
    [
      routesGeojson,
      selectedRouteIds,
      hoveredRouteId,
      setHoveredRouteId,
      colorMode,
      serviceMetrics,
      timeFilter,
      offerRange,
    ]
  );

  const hoveredFeature = useMemo(() => {
    if (!hoveredRouteId || !routesGeojson) return null;
    return routesGeojson.features.find(
      (f) => f.properties.route_id === hoveredRouteId
    );
  }, [hoveredRouteId, routesGeojson]);

  const hoveredOffer = useMemo(() => {
    if (!hoveredFeature || colorMode !== 'offer' || !serviceMetrics) return null;
    return tripsPerHour(
      serviceMetrics,
      hoveredFeature.properties.route_id,
      timeFilter.dayOfWeek,
      timeFilter.startHour,
      timeFilter.endHour
    );
  }, [hoveredFeature, colorMode, serviceMetrics, timeFilter]);

  return (
    <div className="app">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => setViewState(next)}
        controller={!boxSelectMode}
        layers={layers}
      >
        <Map mapStyle={MAP_STYLE} reuseMaps />
      </DeckGL>

      <BoxSelectOverlay viewState={viewState} geojson={routesGeojson} />

      {routesMeta && <LineSelector routesMeta={routesMeta} />}
      {serviceMetrics && <OfferControls offerRange={offerRange} />}

      {hoveredFeature && (
        <div className="hover-info">
          <span
            className="swatch"
            style={{ background: `#${hoveredFeature.properties.route_color}` }}
          />
          <b>Línea {hoveredFeature.properties.route_short_name}</b>
          <span className="long">{hoveredFeature.properties.route_long_name}</span>
          {hoveredOffer !== null && (
            <span className="offer">{hoveredOffer.toFixed(1)} exp/h</span>
          )}
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
