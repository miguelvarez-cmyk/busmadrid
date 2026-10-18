import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapGL } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { BASEMAP_STYLE, INITIAL_VIEW_STATE } from './config/mapConfig.js';
import {
  useMapStore,
  useViewState,
  useSetViewState,
  useSelectedRouteIds,
  useHoveredRouteIds,
  useClickedRouteId,
  usePinnedRouteIds,
  useFichaOpen,
  useIndicator,
  useFilters,
  useCtx,
  useBoxSelectMode,
  useShowStops,
  useStopColorMode,
} from './store/useMapStore.js';
import { useGTFSData } from './utils/useGTFSData.js';
import { useUrlSync } from './utils/useUrlSync.js';
import { NetworkContext } from './utils/network.js';
import { computeIndicators, passesFilters, colorFor, INDICATOR_BY_ID, SERIES_COLORS } from './utils/indicators.js';
import { hexToRgb } from './utils/color.js';
import { createRoutesLayer, sortFeaturesForDraw } from './layers/createRoutesLayer.js';
import { createStopsLayer } from './layers/createStopsLayer.js';
import TopBar from './components/TopBar.jsx';
import RightPanel from './components/RightPanel.jsx';
import MapLegend from './components/MapLegend.jsx';
import LayersControl from './components/LayersControl.jsx';
import MapTooltip from './components/MapTooltip.jsx';
import Methodology from './components/Methodology.jsx';
import BoxSelectOverlay from './components/BoxSelectOverlay.jsx';
import { LoadingScreen } from './components/LoadingScreen.jsx';

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

/** Líneas (de las que pasan) a menos de radiusM del punto, de la más cercana a la más lejana. */
function nearbyRouteIds(geojson, lng, lat, radiusM, passing) {
  if (!geojson) return [];
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const found = [];
  for (const f of geojson.features) {
    const id = f.properties?.route_id;
    if (!id || !passing.has(id)) continue;
    const lines = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
    let best = Infinity;
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const d = ptSegDistM(lng, lat, line[i], line[i + 1], cosLat);
        if (d < best) best = d;
      }
    }
    if (best <= radiusM) found.push([id, best]);
  }
  return found.sort((a, b) => a[1] - b[1]).map(([id]) => id);
}

export default function App() {
  useUrlSync();
  const { data, loading, error, progress } = useGTFSData();

  const viewState = useViewState();
  const setViewState = useSetViewState();
  const selectedRouteIds = useSelectedRouteIds();
  const hoveredRouteIds = useHoveredRouteIds();
  const setHoveredRouteIds = useMapStore((s) => s.setHoveredRouteIds);
  const clickedRouteId = useClickedRouteId();
  const setClickedRouteId = useMapStore((s) => s.setClickedRouteId);
  const pinnedRouteIds = usePinnedRouteIds();
  const fichaOpen = useFichaOpen();
  const indicator = useIndicator();
  const filters = useFilters();
  const ctx = useCtx();
  const boxSelectMode = useBoxSelectMode();
  const showStops = useShowStops();
  const stopColorMode = useStopColorMode();
  const setHoveredStop = useMapStore((s) => s.setHoveredStop);
  const [cursor, setCursor] = useState(null);
  const [mobilePanel, setMobilePanel] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const [showLoader, setShowLoader] = useState(true);
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setShowLoader(false), 600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const allIds = useMemo(() => data?.routesMeta.map((r) => r.id) ?? [], [data]);
  const metaById = useMemo(() => Object.fromEntries((data?.routesMeta ?? []).map((r) => [r.id, r])), [data]);

  // Al cargar: todas las líneas, salvo que la URL traiga una selección
  const didInitRoutes = useRef(false);
  useEffect(() => {
    if (!data || didInitRoutes.current) return;
    didInitRoutes.current = true;
    const s = useMapStore.getState();
    s.setTotalRouteCount(allIds.length);
    const urlR = new URLSearchParams(window.location.search).get('r');
    if (!urlR) s.selectAllRoutes(allIds);
    const years = data.routeDemand?.years ?? [];
    if (years.length && !years.includes(s.year)) s.setYear(data.routeDemand.year ?? years[years.length - 1]);
  }, [data, allIds]);

  const computed = useMemo(() => (data ? computeIndicators(data, allIds, ctx) : null), [data, allIds, ctx]);

  const passing = useMemo(() => {
    if (!computed) return new Set();
    return new Set(allIds.filter((id) => selectedRouteIds.has(id) && passesFilters(computed.values[id], filters)));
  }, [computed, allIds, selectedRouteIds, filters]);

  const fichaIds = useMemo(() => {
    const ids = [...pinnedRouteIds];
    if (clickedRouteId && !ids.includes(clickedRouteId)) ids.push(clickedRouteId);
    return ids.filter((id) => metaById[id]);
  }, [pinnedRouteIds, clickedRouteId, metaById]);

  const focusIds = useMemo(() => new Set(fichaOpen ? fichaIds : []), [fichaOpen, fichaIds]);

  const net = useMemo(
    () => (computed ? { data, metaById, allIds, values: computed.values, stats: computed.stats, passing, ctx, fichaIds } : null),
    [data, metaById, allIds, computed, passing, ctx, fichaIds]
  );

  const ind = indicator ? INDICATOR_BY_ID[indicator] : null;
  // En la comparación, cada línea de la ficha lleva el color de su columna
  const seriesColor = useMemo(() => {
    if (!fichaOpen || fichaIds.length < 2) return null;
    return Object.fromEntries(fichaIds.map((id, i) => [id, hexToRgb(SERIES_COLORS[i % SERIES_COLORS.length].slice(1))]));
  }, [fichaOpen, fichaIds]);
  const colorOf = useCallback(
    (id) => {
      if (seriesColor?.[id]) return seriesColor[id];
      if (!ind) return hexToRgb(metaById[id]?.color ?? '888888');
      return colorFor(ind, computed.stats[ind.id], computed.values[id]?.[ind.id]);
    },
    [ind, metaById, computed, seriesColor]
  );

  const drawFeatures = useMemo(
    () => sortFeaturesForDraw(data?.routesGeojson, passing, focusIds),
    [data, passing, focusIds]
  );

  // Solo se resalta la línea que abriría el clic (la más cercana)
  const hoverHighlight = useMemo(() => hoveredRouteIds.slice(0, 1), [hoveredRouteIds]);

  const layers = useMemo(
    () => [
      createRoutesLayer({
        features: drawFeatures,
        passing,
        colorOf,
        colorKey: colorOf,
        hoveredIds: hoverHighlight,
        focusIds,
      }),
      showStops &&
        createStopsLayer({
          geojson: data?.stopsGeojson,
          passing,
          stopColorMode,
          stopExpeditions: data?.stopExpeditions,
          onHover: setHoveredStop,
        }),
    ].filter(Boolean),
    [drawFeatures, passing, colorOf, hoverHighlight, focusIds, showStops, data, stopColorMode, setHoveredStop]
  );

  // Esc cierra la ficha
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT') return;
      useMapStore.getState().closeFicha();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleReset = () => {
    const s = useMapStore.getState();
    setViewState({ ...INITIAL_VIEW_STATE, transitionDuration: 600 });
    s.selectAllRoutes(allIds);
    s.clearFilters();
    s.setIndicator(null);
    s.setPinnedRouteIds([]);
    s.closeFicha();
  };

  const handleHover = (info) => {
    clearTimeout(hoverTimeoutRef.current);
    if (!info.coordinate || boxSelectMode) {
      hoverTimeoutRef.current = setTimeout(() => setHoveredRouteIds([]), 150);
      return;
    }
    const [lng, lat] = info.coordinate;
    // Radio de captura en metros equivalente a ~8 px al zoom actual
    const mPerPx = (156543 * Math.cos((lat * Math.PI) / 180)) / 2 ** viewState.zoom;
    const ids = nearbyRouteIds(data?.routesGeojson, lng, lat, Math.max(15, 8 * mPerPx), passing).slice(0, 6);
    setCursor({ x: info.x, y: info.y, w: info.viewport?.width ?? 0, h: info.viewport?.height ?? 0 });
    const same = ids.length === hoveredRouteIds.length && ids.every((id, i) => id === hoveredRouteIds[i]);
    if (!same) setHoveredRouteIds(ids);
  };

  const handleClick = (info) => {
    if (boxSelectMode) return;
    const picked = info.object?.properties?.route_id;
    const id = picked && passing.has(picked) ? picked : hoveredRouteIds[0];
    if (id) {
      setClickedRouteId(id);
      setMobilePanel(true);
    }
  };

  return (
    <NetworkContext.Provider value={net}>
      <div className="app">
        <TopBar onReset={handleReset} />

        <main className="map-area" onMouseLeave={() => setHoveredRouteIds([])}>
          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState: next }) => setViewState(next)}
            controller={boxSelectMode ? false : { dragRotate: false, touchRotate: false, inertia: true, scrollZoom: { smooth: true } }}
            layers={layers}
            glOptions={{ powerPreference: 'default' }}
            getCursor={({ isDragging }) => (isDragging ? 'grabbing' : hoveredRouteIds.length ? 'pointer' : 'grab')}
            onClick={handleClick}
            onHover={handleHover}
          >
            <MapGL mapStyle={BASEMAP_STYLE} reuseMaps={false} />
          </DeckGL>
          <BoxSelectOverlay viewState={viewState} geojson={data?.routesGeojson} />
          {net && <MapLegend />}
          {net && <LayersControl />}
          {net && <MapTooltip cursor={cursor} />}
          <button type="button" className={`mobile-panel-toggle ${mobilePanel ? "is-up" : ""}`} onClick={() => setMobilePanel((v) => !v)}>
            {mobilePanel ? 'Mapa' : 'Tabla'}
          </button>
        </main>

        {net && <RightPanel mobileOpen={mobilePanel} />}
        {net && <Methodology />}

        {showLoader && <LoadingScreen loading={loading} progress={progress} />}
        {error && (
          <div className="status-overlay error">
            No se han podido cargar los datos de la red.
            <br />
            <small>Comprueba tu conexión y recarga la página.</small>
          </div>
        )}
      </div>
    </NetworkContext.Provider>
  );
}
