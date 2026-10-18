import { useMapStore, useShowStops, useStopColorMode } from '../store/useMapStore.js';
import { colorAt } from '../utils/indicators.js';

const STOP_MODES = [
  { id: null, label: 'Sin color' },
  { id: 'routes', label: 'Nº de líneas', range: '1 → 8+' },
  { id: 'expeditions', label: 'Exp. hora punta lab.', range: '0 → 60+' },
];
const RAMP = `linear-gradient(to right, ${[0, 0.5, 1].map((t) => `rgb(${colorAt({ color: 'good-high' }, t).join(',')})`).join(', ')})`;

export default function LayersControl() {
  const showStops = useShowStops();
  const stopColorMode = useStopColorMode();
  const { setShowStops, setStopColorMode } = useMapStore.getState();
  const mode = STOP_MODES.find((m) => m.id === stopColorMode);

  return (
    <div className="map-card layers">
      <label className="check">
        <input type="checkbox" checked={showStops} onChange={(e) => setShowStops(e.target.checked)} />
        Paradas
      </label>
      {showStops && (
        <>
          <div className="seg seg--small" role="radiogroup" aria-label="Color de paradas">
            {STOP_MODES.map((m) => (
              <button key={m.label} type="button" role="radio" aria-checked={stopColorMode === m.id} className={stopColorMode === m.id ? 'on' : ''} onClick={() => setStopColorMode(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          {mode?.range && (
            <div className="layers-ramp">
              <span className="ramp" style={{ background: RAMP }} />
              <span className="muted">{mode.range}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
