import { MAP_STYLE, INITIAL_VIEW_STATE } from './config/mapConfig.js';
import { useViewState, useSetViewState } from './store/useMapStore.js';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function App() {
  const viewState = useViewState();
  const setViewState = useSetViewState();

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: next }) => setViewState(next)}
      controller
      layers={[]}
    >
      <Map mapStyle={MAP_STYLE} reuseMaps />
    </DeckGL>
  );
}
