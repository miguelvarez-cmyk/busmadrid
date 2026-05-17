import { useMapStore, useShowMetroLines, useShowMetroStops } from '../../store/useMapStore.js';

export default function MetroCercaniasPanel({ metroCercaniasRoutes }) {
  const showMetroLines = useShowMetroLines();
  const showMetroStops = useShowMetroStops();
  const setShowMetroLines = useMapStore((s) => s.setShowMetroLines);
  const setShowMetroStops = useMapStore((s) => s.setShowMetroStops);

  const hasData = !!metroCercaniasRoutes;

  const metroCount = metroCercaniasRoutes
    ? metroCercaniasRoutes.features.filter((f) => f.properties.mode === 'metro').length
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {!hasData && (
        <p className="muted" style={{ marginBottom: 8 }}>
          Ejecuta <code>download_gtfs_crtm.py</code> y <code>process_metro_cercanias.py</code> para activar esta capa.
        </p>
      )}

      <div style={{ marginBottom: '4px' }}>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Metro
        </span>
        {metroCount > 0 && <span className="muted"> ({metroCount} líneas)</span>}
      </div>

      <label style={{ opacity: hasData ? 1 : 0.4 }}>
        <input
          type="checkbox"
          checked={showMetroLines}
          onChange={(e) => setShowMetroLines(e.target.checked)}
          disabled={!hasData}
        />
        <span>Líneas de metro</span>
      </label>

      <label style={{ opacity: hasData ? 1 : 0.4 }}>
        <input
          type="checkbox"
          checked={showMetroStops}
          onChange={(e) => setShowMetroStops(e.target.checked)}
          disabled={!hasData}
        />
        <span>Estaciones de metro</span>
      </label>
    </div>
  );
}
