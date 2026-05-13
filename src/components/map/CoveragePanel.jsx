import { useMemo } from 'react';
import {
  useMapStore,
  useColorMode,
  useCoverageFilter,
  useCoverageDistance,
} from '../../store/useMapStore.js';
import { coverageHistogram } from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

function formatPax(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1_000)}k`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(Math.round(v));
}

export default function CoveragePanel({ routeCoverage, selectedRouteIds, visibleRouteIds }) {
  const colorMode = useColorMode();
  const setColorMode = useMapStore((s) => s.setColorMode);
  const coverageFilter = useCoverageFilter();
  const setCoverageFilter = useMapStore((s) => s.setCoverageFilter);
  const coverageDistance = useCoverageDistance();
  const setCoverageDistance = useMapStore((s) => s.setCoverageDistance);

  const isActive = colorMode === 'coverage';

  const coverageBuckets = useMemo(
    () =>
      isActive && routeCoverage && coverageFilter
        ? coverageHistogram(routeCoverage, selectedRouteIds, coverageDistance, coverageFilter)
        : [],
    [isActive, routeCoverage, selectedRouteIds, coverageDistance, coverageFilter]
  );

  if (!routeCoverage) return <p className="caption muted">Datos de cobertura no disponibles.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <button
        role="radio"
        aria-checked={isActive}
        className={isActive ? 'active' : ''}
        style={{ width: '100%', padding: '8px 12px' }}
        onClick={() => setColorMode('coverage')}
      >
        {isActive ? 'Colorear mapa por cobertura ✓' : 'Colorear mapa por cobertura'}
      </button>

      <div className="filter-block">
        <div className="filter-title">
          <span>Distancia máxima caminando</span>
          <span className="muted">{coverageDistance} m</span>
        </div>
        <input
          type="range"
          min={50}
          max={800}
          step={50}
          value={coverageDistance}
          onChange={(e) => {
            const d = Number(e.target.value);
            setCoverageDistance(d);
            setCoverageFilter([routeCoverage[`min_${d}`] ?? 0, routeCoverage[`max_${d}`] ?? 1]);
          }}
          style={{ width: '100%', margin: '6px 0 2px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted, #888)', marginBottom: '4px' }}>
          <span>50 m</span>
          <span>800 m</span>
        </div>
      </div>

      {coverageFilter && (
        <div className="filter-block">
          <div className="filter-title">
            <span>Personas servidas a {coverageDistance} m</span>
            <span className="muted">
              {visibleRouteIds.size}/{selectedRouteIds.size} visibles
            </span>
          </div>
          <Histogram buckets={coverageBuckets} />
          <RangeSlider
            min={routeCoverage[`min_${coverageDistance}`] ?? 0}
            max={routeCoverage[`max_${coverageDistance}`] ?? 1}
            step={500}
            value={coverageFilter}
            onChange={setCoverageFilter}
            format={(v) => formatPax(v) + ' hab'}
          />
          <div className="caption muted">
            Población que vive a menos de {coverageDistance} m caminando de
            alguna parada de la línea (isócronas peatonales sobre la red OSM).
            Verde = más cobertura · Rojo = menos cobertura.
          </div>
        </div>
      )}
    </div>
  );
}
