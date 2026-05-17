import { useMemo } from 'react';
import {
  useMapStore,
  useColorMode,
  useCoverageDistance,
  useCoverageFilter,
  useBuildingCoverageMode,
  useSelectedBuilding,
} from '../../store/useMapStore.js';
import { coverageHistogram, buildingLineHistogram } from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

function formatPob(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      className={`toggle-button ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '8px 12px',
        background: active ? '#1a1a1a' : '#f9fafb',
        color: active ? '#fff' : '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        marginBottom: '8px',
        textAlign: 'left',
      }}
    >
      {children}
    </button>
  );
}

function BuildingDetail({ building, onClose }) {
  const lineas = useMemo(() => {
    try {
      return JSON.parse(building.lineas);
    } catch {
      return [];
    }
  }, [building.lineas]);

  return (
    <div
      style={{
        marginTop: '10px',
        padding: '10px 12px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        fontSize: '13px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <strong style={{ fontSize: '12px', wordBreak: 'break-word', flex: 1 }}>
          {building.address}
        </strong>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '14px',
            padding: '0 0 0 8px',
            lineHeight: 1,
          }}
        >
          &#x2715;
        </button>
      </div>
      <div style={{ color: '#374151', marginBottom: '4px' }}>
        <span style={{ fontWeight: 500 }}>{Math.round(building.poblacion)}</span>
        {' '}personas estimadas
      </div>
      <div style={{ color: '#374151', marginBottom: '8px' }}>
        <span style={{ fontWeight: 500 }}>{building.n_lineas}</span>
        {' '}l&#237;nea{building.n_lineas !== 1 ? 's' : ''} a &lt;350 m
      </div>
      {lineas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {lineas.map((l) => (
            <span
              key={l}
              style={{
                background: '#e5e7eb',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoveragePanel({ routeCoverage, routesMeta, buildingLineCoverage, buildingCoverageLoading }) {
  const colorMode = useColorMode();
  const setColorMode = useMapStore((s) => s.setColorMode);
  const coverageDistance = useCoverageDistance();
  const setCoverageDistance = useMapStore((s) => s.setCoverageDistance);
  const coverageFilter = useCoverageFilter();
  const setCoverageFilter = useMapStore((s) => s.setCoverageFilter);

  const buildingCoverageMode = useBuildingCoverageMode();
  const setBuildingCoverageMode = useMapStore((s) => s.setBuildingCoverageMode);
  const selectedBuilding = useSelectedBuilding();
  const setSelectedBuilding = useMapStore((s) => s.setSelectedBuilding);

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

  const buildingBuckets = useMemo(
    () => (buildingCoverageMode && buildingLineCoverage ? buildingLineHistogram(buildingLineCoverage) : []),
    [buildingCoverageMode, buildingLineCoverage]
  );

  const handleDistanceChange = (e) => {
    const newDist = Number(e.target.value);
    setCoverageDistance(newDist);
    if (routeCoverage) {
      const distKey = String(newDist);
      const values = Object.values(routeCoverage.byRoute)
        .map((r) => r[distKey] ?? 0)
        .filter((v) => v > 0);
      const newMax = values.length > 0 ? Math.max(...values) : 0;
      setCoverageFilter([0, newMax]);
    }
  };

  return (
    <div className="otros-panel">

      {/* Cobertura de poblacion por linea */}
      <div className="otros-section">
        {routeCoverage ? (
          <>
            <ToggleBtn active={colorMode === 'coverage'} onClick={() => setColorMode('coverage')}>
              {colorMode === 'coverage' ? '✓ Cobertura de población' : 'Cobertura de población'}
            </ToggleBtn>

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
                  Habitantes a menos de {coverageDistance} m caminando de alguna parada de la l&#237;nea.
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="otros-empty">
            Sin datos. Ejecuta <code>prepare_coverage.py</code>.
          </div>
        )}
      </div>

      {/* Lineas por edificio */}
      <div className="otros-section" style={{ marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
        <ToggleBtn active={buildingCoverageMode} onClick={() => setBuildingCoverageMode(true)}>
          {buildingCoverageMode ? '✓ Líneas por edificio' : 'Líneas por edificio'}
        </ToggleBtn>

        {buildingCoverageMode && (
          <div className="filter-block">
            {buildingCoverageLoading && (
              <div className="caption muted" style={{ marginBottom: '6px' }}>Cargando edificios&#8230;</div>
            )}

            {buildingLineCoverage && (
              <>
                <div className="caption muted" style={{ marginBottom: '6px' }}>
                  {buildingLineCoverage.features.length.toLocaleString('es-ES')} edificios &middot; radio 350 m
                </div>
                <Histogram buckets={buildingBuckets} />
                <div className="caption muted" style={{ marginTop: '6px' }}>
                  N&#186; l&#237;neas con parada a &lt;350&#8239;m.
                  Gris&#8239;=&#8239;sin cobertura &middot; Rojo&#8239;=&#8239;pocas &middot; Verde&#8239;=&#8239;muchas.
                </div>
              </>
            )}

            {!buildingLineCoverage && !buildingCoverageLoading && (
              <div className="otros-empty">
                Sin datos. Ejecuta <code>compute_building_line_coverage.py</code>.
              </div>
            )}

            {selectedBuilding && (
              <BuildingDetail
                building={selectedBuilding}
                onClose={() => setSelectedBuilding(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
