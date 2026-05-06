import { BASEMAPS, BASEMAP_ORDER } from '../../config/mapConfig.js';

export default function LayerToggles({ basemap, setBasemap }) {
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
    </div>
  );
}
