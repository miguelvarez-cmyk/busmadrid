import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { MAP_STYLE } from './config/mapConfig.js';
import { useViewState, useSetViewState, useSelectedRouteIds } from './store/useMapStore.js';
import { useGTFSData } from './utils/useGTFSData.js';
import { createRoutesLayer } from './layers/createRoutesLayer.js';
import LineSelector from './components/map/LineSelector.jsx';

export default function App() {
  const viewState = useViewState();
  const setViewState = useSetViewState();
  const selectedRouteIds = useSelectedRouteIds();
  const { routesGeojson, routesMeta, loading, error } = useGTFSData();

  const layers = useMemo(
    () => [createRoutesLayer({ geojson: routesGeojson, selectedRouteIds })].filter(Boolean),
    [routesGeojson, selectedRouteIds]
  );

  return (
    <div className="app">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => setViewState(next)}
        controller
        layers={layers}
        getTooltip={({ object }) =>
          object && {
            html: `<b>Línea ${object.properties.route_short_name}</b><br/>${object.properties.route_long_name}`,
            style: { background: '#111', color: '#fff', padding: '6px 8px', fontSize: '12px' },
          }
        }
      >
        <Map mapStyle={MAP_STYLE} reuseMaps />
      </DeckGL>

      {routesMeta && <LineSelector routesMeta={routesMeta} />}

      {loading && <div className="status-overlay">Cargando datos GTFS...</div>}
      {error && (
        <div className="status-overlay error">
          Error cargando datos: {error.message}
          <br />
          <small>¿Has ejecutado <code>python scripts/process_gtfs.py</code>?</small>
        </div>
      )}
    </div>
  );
}
