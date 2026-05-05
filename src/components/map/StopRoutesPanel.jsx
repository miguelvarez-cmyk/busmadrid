import { useMemo } from 'react';
import { useMapStore, useStopRoutesFilter } from '../../store/useMapStore.js';
import { stopRoutesHistogram } from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

export default function StopRoutesPanel({ stopsGeojson }) {
  const stopRoutesFilter = useStopRoutesFilter();
  const setStopRoutesFilter = useMapStore((s) => s.setStopRoutesFilter);

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

  return (
    <div className="controls">
      <div className="filter-block">
        <div className="filter-title">
          <span>Paradas por nº de líneas</span>
          <span className="muted">{totalStops} paradas</span>
        </div>
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
          Filtra las paradas visibles según cuántas líneas las sirven.
          Solo activo cuando "Mostrar paradas" está habilitado.
        </div>
      </div>
    </div>
  );
}
