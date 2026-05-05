import { BASEMAPS, BASEMAP_ORDER } from '../../config/mapConfig.js';

export default function LayerToggles({ basemap, setBasemap, showStops, setShowStops, stopsGeojson }) {
  return (
    <div className="layer-toggles-content">
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
  );
}
