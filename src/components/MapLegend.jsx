import { useMemo } from 'react';
import { useMapStore, useIndicator, useFilters, useSelectedRouteIds } from '../store/useMapStore.js';
import {
  INDICATOR_BY_ID,
  labelWithUnit,
  contextLabel,
  formatValue,
  histogram,
  normalize,
  denormalize,
  gradientCss,
  passesFilters,
  filterLabel,
} from '../utils/indicators.js';
import { useNetwork } from '../utils/network.js';
import InfoTip from './InfoTip.jsx';

const STEPS = 200;
const N_BINS = 20;

export default function MapLegend() {
  const indicator = useIndicator();
  const filters = useFilters();
  const selected = useSelectedRouteIds();
  const { data, allIds, values, stats, ctx } = useNetwork();
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

  if (!ind) {
    return (
      <div className="map-card legend legend--empty">
        Red neutra: colores corporativos de línea. Elige un <b>indicador</b> arriba para colorear la red y ordenar la tabla.
      </div>
    );
  }

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
  const fmtEdge = (v) => formatValue(ind, v);
  const ctxText = contextLabel(ind, ctx, data.routeDemand);

  return (
    <div className="map-card legend">
      <div className="legend-head">
        <b>{labelWithUnit(ind, ctx)}</b>
        <InfoTip id={ind.id} />
      </div>
      {ctxText && <div className="legend-ctx muted">{ctxText}</div>}

      <div className="hist" aria-hidden="true">
        {hist.bins.map((b, i) => {
          const inRange = (i + 1) * (STEPS / N_BINS) > tLo && i * (STEPS / N_BINS) < tHi;
          return (
            <div
              key={i}
              className="hist-bar"
              title={`${fmtEdge(b.lo)}–${fmtEdge(b.hi)}: ${b.count} líneas`}
              style={{
                height: `${b.count ? Math.max(4, (b.count / maxCount) * 100) : 0}%`,
                background: inRange ? `rgb(${b.color.join(',')})` : 'var(--bg-surface-3)',
              }}
            />
          );
        })}
        {medianPos != null && <div className="hist-median" style={{ left: `${medianPos}%` }} title={`Mediana de la red: ${fmtEdge(stat.median)}`} />}
      </div>
      <div className="legend-ramp" style={{ background: gradientCss(ind) }} />

      <div className="brush">
        <input type="range" min={0} max={STEPS} value={tLo} aria-label="Mínimo del filtro" onChange={(e) => apply(Math.min(+e.target.value, tHi - 1), tHi)} />
        <input type="range" min={0} max={STEPS} value={tHi} aria-label="Máximo del filtro" onChange={(e) => apply(tLo, Math.max(+e.target.value, tLo + 1))} />
      </div>
      <div className="legend-scale">
        <span>{stat.min < stat.domain[0] ? '≤ ' : ''}{fmtEdge(stat.domain[0])}</span>
        {medianPos != null && <span className="muted">mediana {fmtEdge(stat.median)}</span>}
        <span>{stat.max > stat.domain[1] ? '≥ ' : ''}{fmtEdge(stat.domain[1])}</span>
      </div>

      <div className="legend-foot">
        {filters[ind.id] ? (
          <>
            <span>Filtro <b>{filterLabel(ind, filters[ind.id])}</b></span>
            <button type="button" className="btn-link" onClick={() => setFilter(ind.id, null)}>Quitar</button>
          </>
        ) : (
          <span className="muted">Arrastra los extremos para filtrar</span>
        )}
        {hist.noData > 0 && <span className="muted legend-nodata"><i className="nodata-swatch" /> sin dato: {hist.noData}</span>}
      </div>
    </div>
  );
}
