import { useMemo } from 'react';
import {
  useMapStore,
  useColorMode,
  useFleetFilter,
  useDemandFilter,
  useOccupancyFilter,
  useFleetDayType,
} from '../../store/useMapStore.js';
import {
  fleetHistogram,
  demandHistogram,
  formatSpanMinutes,
} from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

const FLEET_DAY_TYPES = [
  { id: 'LA', label: 'Laborable' },
  { id: 'SA', label: 'Sábado' },
  { id: 'FE', label: 'Festivo' },
];

function formatPax(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(v);
}

export default function OtrosPanel({
  routeFleet,
  routeDemand,
  occupancyData,
  routesMeta,
  selectedRouteIds,
}) {
  const colorMode = useColorMode();
  const setColorMode = useMapStore((s) => s.setColorMode);
  const fleetFilter = useFleetFilter();
  const setFleetFilter = useMapStore((s) => s.setFleetFilter);
  const demandFilter = useDemandFilter();
  const setDemandFilter = useMapStore((s) => s.setDemandFilter);
  const occupancyFilter = useOccupancyFilter();
  const setOccupancyFilter = useMapStore((s) => s.setOccupancyFilter);
  const fleetDayType = useFleetDayType();
  const setFleetDayType = useMapStore((s) => s.setFleetDayType);

  // Demanda: filtrar ids en GTFS como en VisualizationControls
  const demandRouteIds = useMemo(() => {
    if (!routeDemand || !routesMeta) return [];
    const inGtfs = new Set(routesMeta.map((r) => r.id));
    return Object.keys(routeDemand.byRoute).filter((id) => inGtfs.has(id));
  }, [routeDemand, routesMeta]);

  const demandStats = useMemo(() => {
    if (!routeDemand || demandRouteIds.length === 0) return null;
    const values = demandRouteIds.map((id) => routeDemand.byRoute[id].dailyAvg);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      dropped: Object.keys(routeDemand.byRoute).length - values.length,
    };
  }, [routeDemand, demandRouteIds]);

  // Histogramas
  const fleetBuckets = useMemo(
    () =>
      colorMode === 'fleet' && routeFleet && fleetFilter
        ? fleetHistogram(routeFleet, selectedRouteIds, fleetDayType, fleetFilter)
        : [],
    [colorMode, routeFleet, selectedRouteIds, fleetDayType, fleetFilter]
  );

  const demandBuckets = useMemo(
    () =>
      colorMode === 'demand' && routeDemand && demandFilter
        ? demandHistogram(routeDemand, demandRouteIds, demandFilter)
        : [],
    [colorMode, routeDemand, demandRouteIds, demandFilter]
  );

  const maxOccupancy = useMemo(() => {
    if (!occupancyData || Object.keys(occupancyData).length === 0) return 1;
    const values = Object.values(occupancyData).filter((v) => v > 0);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [occupancyData]);

  const occupancyBuckets = useMemo(() => {
    if (colorMode !== 'occupancy' || !occupancyData || occupancyFilter == null) return [];
    const values = Object.values(occupancyData).filter((v) => v > 0);
    if (values.length === 0) return [];
    const maxVal = maxOccupancy;
    const binWidth = Math.max(1, Math.ceil(maxVal / 20));
    const nBins = Math.ceil(maxVal / binWidth) + 1;
    const counts = new Array(nBins).fill(0);
    for (const occ of values) {
      const i = Math.min(Math.floor(occ / binWidth), nBins - 1);
      counts[i]++;
    }
    const [fMin, fMax] = occupancyFilter;
    return counts.map((count, i) => {
      const binLo = i * binWidth;
      const binHi = binLo + binWidth;
      const t = maxVal > 0 ? Math.min((binLo + binHi / 2) / maxVal, 1) : 0;
      let color;
      if (t < 0.5) {
        const k = t / 0.5;
        color = [
          Math.round(50 + 170 * k),
          200,
          50,
        ];
      } else {
        const k = (t - 0.5) / 0.5;
        color = [
          220,
          Math.round(200 - 150 * k),
          50,
        ];
      }
      return {
        label: `${binLo.toFixed(0)}–${binHi.toFixed(0)}`,
        count,
        color,
        inRange: binLo <= fMax && binHi > fMin,
      };
    });
  }, [colorMode, occupancyData, occupancyFilter, maxOccupancy]);

  if (!routeFleet && !routeDemand && !occupancyData) return null;

  return (
    <div className="otros-panel">
      {routeFleet && (
        <div className="otros-section">
          <button
            className={`toggle-button ${colorMode === 'fleet' ? 'active' : ''}`}
            onClick={() => setColorMode('fleet')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: colorMode === 'fleet' ? '#1a1a1a' : '#f9fafb',
              color: colorMode === 'fleet' ? '#fff' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              marginBottom: '8px',
            }}
          >
            {colorMode === 'fleet' ? '✓ Flota' : 'Flota'}
          </button>
          {colorMode === 'fleet' && fleetFilter && (
            <div className="filter-block">
              <div className="row days">
                {FLEET_DAY_TYPES.map((t) => (
                  <button
                    key={t.id}
                    className={fleetDayType === t.id ? 'active' : ''}
                    onClick={() => setFleetDayType(t.id)}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      background: fleetDayType === t.id ? '#1a1a1a' : '#f9fafb',
                      color: fleetDayType === t.id ? '#fff' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Histogram buckets={fleetBuckets} />
              <RangeSlider
                min={0}
                max={routeFleet.max}
                step={1}
                value={fleetFilter}
                onChange={setFleetFilter}
                format={(v) => `${v} bus${v !== 1 ? 'es' : ''}`}
              />
            </div>
          )}
        </div>
      )}

      {routeDemand && demandStats && (
        <div className="otros-section">
          <button
            className={`toggle-button ${colorMode === 'demand' ? 'active' : ''}`}
            onClick={() => setColorMode('demand')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: colorMode === 'demand' ? '#1a1a1a' : '#f9fafb',
              color: colorMode === 'demand' ? '#fff' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              marginBottom: '8px',
            }}
          >
            {colorMode === 'demand' ? '✓ Demanda' : 'Demanda'}
          </button>
          {colorMode === 'demand' && demandFilter && (
            <div className="filter-block">
              <Histogram buckets={demandBuckets} />
              <RangeSlider
                min={0}
                max={demandStats.max}
                step={100}
                value={demandFilter}
                onChange={setDemandFilter}
                format={formatPax}
              />
              <div className="caption muted">
                {demandStats.dropped > 0 && (
                  <>Omitidas {demandStats.dropped} líneas 2025. </>
                )}
                Viajeros promedio por día.
              </div>
            </div>
          )}
        </div>
      )}

      {occupancyData && Object.keys(occupancyData).length > 0 && (
        <div className="otros-section">
          <button
            className={`toggle-button ${colorMode === 'occupancy' ? 'active' : ''}`}
            onClick={() => setColorMode('occupancy')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: colorMode === 'occupancy' ? '#1a1a1a' : '#f9fafb',
              color: colorMode === 'occupancy' ? '#fff' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              marginBottom: '8px',
            }}
          >
            {colorMode === 'occupancy' ? '✓ pax/expedición (2025)' : 'pax/expedición (2025)'}
          </button>
          {colorMode === 'occupancy' && occupancyFilter && (
            <div className="filter-block">
              <Histogram buckets={occupancyBuckets} />
              <RangeSlider
                min={0}
                max={maxOccupancy}
                step={0.1}
                value={occupancyFilter}
                onChange={setOccupancyFilter}
                format={(v) => `${v.toFixed(1)} pax`}
              />
              <div className="caption muted">
                Viajeros por expedición (demanda ÷ expediciones).
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
