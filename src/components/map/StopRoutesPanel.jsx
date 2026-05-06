import { useMemo } from 'react';
import { useMapStore, useStopRoutesFilter, useStopColorMode, useSelectedRouteIds } from '../../store/useMapStore.js';
import { stopRoutesHistogram } from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

export default function StopRoutesPanel({ stopsGeojson }) {
  const stopRoutesFilter = useStopRoutesFilter();
  const setStopRoutesFilter = useMapStore((s) => s.setStopRoutesFilter);
  const stopColorMode = useStopColorMode();
  const setStopColorMode = useMapStore((s) => s.setStopColorMode);
  const setSelectedRouteIds = useMapStore((s) => s.setSelectedRouteIds);

  const maxRoutes = useMemo(() => {
    if (!stopsGeojson) return 10;
    let max = 1;
    for (const f of stopsGeojson.features) {
      const n = f.properties.routes?.length ?? 0;
      if (n > max) max = n;
    }
    return max;
  }, [stopsGeojson]);

  const totalStops = stopsGeojson?.features?.length ?? 0;

  const buckets = useMemo(
    () => stopRoutesHistogram(stopsGeojson, stopRoutesFilter ?? [1, maxRoutes]),
    [stopsGeojson, stopRoutesFilter, maxRoutes]
  );

  if (!stopsGeojson || !stopRoutesFilter) return null;

  const isActive = stopColorMode === 'routes';

  return (
    <div className="controls">
      <button
        className={`toggle-button ${isActive ? 'active' : ''}`}
        onClick={() => setStopColorMode('routes')}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: isActive ? '#1a1a1a' : '#f9fafb',
          color: isActive ? '#fff' : '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 500,
          marginBottom: '8px',
        }}
      >
        {isActive ? '✓ Paradas por nº líneas' : 'Paradas por nº líneas'}
      </button>

      <button
        onClick={() => setSelectedRouteIds([])}
        style={{
          width: '100%',
          padding: '6px 12px',
          background: '#f9fafb',
          color: '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          marginBottom: '8px',
        }}
      >
        Ocultar líneas
      </button>

      {isActive && (
        <div className="filter-block">
          <Histogram buckets={buckets} />
          <RangeSlider
            min={1}
            max={maxRoutes}
            step={1}
            value={stopRoutesFilter}
            onChange={setStopRoutesFilter}
            format={(v) => `${v} línea${v !== 1 ? 's' : ''}`}
          />
          <div className="caption muted">
            Colorea paradas según cuántas líneas las sirven.
          </div>
        </div>
      )}
    </div>
  );
}
