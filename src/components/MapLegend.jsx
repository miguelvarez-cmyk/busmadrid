import { useMemo } from 'react';
import { useMapStore, useIndicator, useFilters, useSelectedRouteIds } from '../store/useMapStore.js';
import {
  INDICATOR_BY_ID,
  labelWithUnit,
  formatValue,
  histogram,
  normalize,
  denormalize,
  passesFilters,
} from '../utils/indicators.js';
import { useNetwork } from '../utils/network.js';

const STEPS = 200;
const N_BINS = 20;

export default function MapLegend() {
  const indicator = useIndicator();
  const filters = useFilters();
  const selected = useSelectedRouteIds();
  const { allIds, values, stats, ctx } = useNetwork();
  const setFilter = useMapStore((s) => s.setFilter);
  const ind = indicator ? INDICATOR_BY_ID[indicator] : null;
  const stat = ind ? stats[ind.id] : null;

  // Distribución de las líneas del ámbito que pasan el resto de filtros
  const hist = useMemo(() => {
    if (!ind) return null;
    const others = { ...filters };
    delete others[ind.id];
    const vals = allIds.filter((id) => selected.has(id) && passesFilters(values[id], others)).map((id) => values[id][ind.id]);
    return histogram(ind, stat, vals, N_BINS);
  }, [ind, stat, filters, allIds, selected, values]);

  if (!ind) return null;

  const range = filters[ind.id] ?? [null, null];
  const tLo = range[0] == null ? 0 : Math.round(normalize(ind, stat, range[0]) * STEPS);
  const tHi = range[1] == null ? STEPS : Math.round(normalize(ind, stat, range[1]) * STEPS);
  const maxCount = Math.max(1, ...hist.bins.map((b) => b.count));

  const valueAt = (step) => {
    const v = denormalize(ind, stat, step / STEPS);
    const k = 10 ** ind.decimals;
    return Math.round(v * k) / k;
  };
  const apply = (lo, hi) => {
    setFilter(ind.id, [lo <= 0 ? null : valueAt(lo), hi >= STEPS ? null : valueAt(hi)]);
  };
  const medianPos = stat.median != null ? normalize(ind, stat, stat.median) * 100 : null;
  const fmt = (v) => formatValue(ind, v);
  const lo = range[0] ?? stat.domain[0];
  const hi = range[1] ?? stat.domain[1];

  return (
    <div className="map-card legend" title="Arrastra los extremos para filtrar">
      <div className="legend-head">{labelWithUnit(ind, ctx)}</div>
      <div className="hist" aria-hidden="true">
        {hist.bins.map((b, i) => {
          const inRange = (i + 1) * (STEPS / N_BINS) > tLo && i * (STEPS / N_BINS) < tHi;
          return (
            <div
              key={i}
              className="hist-bar"
              title={`${fmt(b.lo)}–${fmt(b.hi)}: ${b.count} líneas`}
              style={{
                height: `${b.count ? Math.max(4, (b.count / maxCount) * 100) : 0}%`,
                background: inRange ? `rgb(${b.color.join(',')})` : 'var(--bg-surface-3)',
              }}
            />
          );
        })}
        {medianPos != null && <div className="hist-median" style={{ left: `${medianPos}%` }} title={`Mediana de la red: ${fmt(stat.median)}`} />}
      </div>
      <div className="brush">
        <input type="range" min={0} max={STEPS} value={tLo} aria-label="Mínimo del filtro" onChange={(e) => apply(Math.min(+e.target.value, tHi - 1), tHi)} />
        <input type="range" min={0} max={STEPS} value={tHi} aria-label="Máximo del filtro" onChange={(e) => apply(tLo, Math.max(+e.target.value, tLo + 1))} />
      </div>
      <div className="legend-scale">
        <span>{fmt(lo)}</span>
        <span>{fmt(hi)}</span>
      </div>
    </div>
  );
}
