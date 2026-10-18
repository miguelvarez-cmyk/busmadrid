import { useMapStore, useShowStops, useStopColorMode } from '../store/useMapStore.js';

const STOP_MODES = [
  { id: '', label: 'Sin color' },
  { id: 'routes', label: 'Por nº de líneas' },
  { id: 'expeditions', label: 'Por expediciones' },
];

export default function LayersControl() {
  const showStops = useShowStops();
  const stopColorMode = useStopColorMode();
  const { setShowStops, setStopColorMode } = useMapStore.getState();

  return (
    <div className="map-card layers">
      <label className="check">
        <input type="checkbox" checked={showStops} onChange={(e) => setShowStops(e.target.checked)} />
        Paradas
      </label>
      {showStops && (
        <select
          className="ctl"
          aria-label="Color de las paradas"
          title="Verde = parada más servida"
          value={stopColorMode ?? ''}
          onChange={(e) => setStopColorMode(e.target.value || null)}
        >
          {STOP_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      )}
    </div>
  );
}
