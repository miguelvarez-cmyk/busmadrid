import { useMemo } from 'react';
import {
  useMapStore,
  useColorMode,
  useCoverageDistance,
  useCoverageFilter,
} from '../../store/useMapStore.js';
import { coverageHistogram } from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

function formatPob(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}

export default function CoveragePanel({ routeCoverage, routesMeta }) {
  const colorMode = useColorMode();
  const setColorMode = useMapStore((s) => s.setColorMode);
  const coverageDistance = useCoverageDistance();
  const setCoverageDistance = useMapStore((s) => s.setCoverageDistance);
  const coverageFilter = useCoverageFilter();
  const setCoverageFilter = useMapStore((s) => s.setCoverageFilter);

  const coverageRouteIds = useMemo(() => {
    if (!routeCoverage || !routesMeta) return [];
    const inGtfs = new Set(routesMeta.map((r) => r.id));
    return Object.keys(routeCoverage.byRoute).filter((id) => inGtfs.has(id));
  }, [routeCoverage, routesMeta]);

  const maxCoverage = useMemo(() => {
    if (!routeCoverage || coverageRouteIds.length === 0) return 1;
    const distKey = String(coverageDistance);
    const values = coverageRouteIds
      .map((id) => routeCoverage.byRoute[id]?.[distKey] ?? 0)
      .filter((v) => v > 0);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [routeCoverage, coverageRouteIds, coverageDistance]);

  const coverageBuckets = useMemo(
    () =>
      colorMode === 'coverage' && routeCoverage && coverageFilter
        ? coverageHistogram(routeCoverage, coverageRouteIds, coverageFilter, coverageDistance)
        : [],
    [colorMode, routeCoverage, coverageRouteIds, coverageFilter, coverageDistance]
  );

  const handleDistanceChange = (e) => {
    const newDist = Number(e.target.value);
    setCoverageDistance(newDist);
    // Reinicializar el filtro al nuevo rango de la distancia seleccionada
    if (routeCoverage) {
      const distKey = String(newDist);
      const values = Object.values(routeCoverage.byRoute)
        .map((r) => r[distKey] ?? 0)
        .filter((v) => v > 0);
      const newMax = values.length > 0 ? Math.max(...values) : 0;
      setCoverageFilter([0, newMax]);
    }
  };

  if (!routeCoverage) {
    return (
      <div className="otros-empty">
        Sin datos. Ejecuta <code>prepare_coverage.py</code>.
      </div>
    );
  }

  return (
    <div className="otros-panel">
      <div className="otros-section">
        <button
          className={`toggle-button ${colorMode === 'coverage' ? 'active' : ''}`}
          onClick={() => setColorMode('coverage')}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: colorMode === 'coverage' ? '#1a1a1a' : '#f9fafb',
            color: colorMode === 'coverage' ? '#fff' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            marginBottom: '8px',
          }}
        >
          {colorMode === 'coverage' ? '✓ Cobertura de población' : 'Cobertura de población'}
        </button>

        {colorMode === 'coverage' && coverageFilter && (
          <div className="filter-block">
            <div style={{ marginBottom: '10px' }}>
              <label
                htmlFor="coverage-distance-slider"
                style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}
              >
                Radio a pie: <strong>{coverageDistance} m</strong>
              </label>
              <input
                id="coverage-distance-slider"
                type="range"
                min={50}
                max={800}
                step={50}
                value={coverageDistance}
                onChange={handleDistanceChange}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
                <span>50 m</span>
                <span>800 m</span>
              </div>
            </div>
            <Histogram buckets={coverageBuckets} />
            <RangeSlider
              min={0}
              max={maxCoverage}
              step={Math.max(1, Math.round(maxCoverage / 200))}
              value={coverageFilter}
              onChange={setCoverageFilter}
              format={formatPob}
            />
            <div className="caption muted">
              Habitantes a menos de {coverageDistance} m caminando de alguna parada de la línea.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
