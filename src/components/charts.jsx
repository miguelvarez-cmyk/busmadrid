import { normalize, percentile, colorFor, formatValue } from '../utils/indicators.js';

const W = 300;
const H = 80;

/**
 * Gráfico de 24 horas. Una serie → barras; varias → líneas escalonadas.
 * series: [{ id, color, values: number[24] (null = sin dato) }]
 */
export function HourChart({ series, band, fmt = (v) => Math.round(v) }) {
  const max = Math.max(1, ...series.flatMap((s) => s.values.filter((v) => v != null)));
  const bw = W / 24;
  const y = (v) => H - (v / max) * H;
  return (
    <div className="chart">
      <div className="chart-y"><span>{fmt(max)}</span><span>0</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart-svg" role="img">
        {band && <rect x={band[0] * bw} y={0} width={(band[1] - band[0]) * bw} height={H} className="chart-band" />}
        {series.length === 1
          ? series[0].values.map((v, h) =>
              v ? (
                <rect key={h} x={h * bw + 0.6} y={y(v)} width={bw - 1.2} height={H - y(v)} fill={series[0].barColors?.[h] ?? series[0].color}>
                  <title>{`${String(h).padStart(2, '0')}:00 · ${fmt(v)}`}</title>
                </rect>
              ) : null
            )
          : series.map((s) => (
              <polyline
                key={s.id}
                fill="none"
                stroke={s.color}
                strokeWidth="1.6"
                vectorEffect="non-scaling-stroke"
                points={s.values.flatMap((v, h) => (v == null ? [] : [`${h * bw},${y(v)}`, `${(h + 1) * bw},${y(v)}`])).join(' ')}
              />
            ))}
      </svg>
      <div className="chart-x"><span>0 h</span><span>6</span><span>12</span><span>18</span><span>24 h</span></div>
    </div>
  );
}

/** Serie mensual de varios años. series: [{ id, color, points: [{ label, v }] }] */
export function MonthChart({ series }) {
  const n = Math.max(...series.map((s) => s.points.length));
  if (!n) return null;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.v ?? 0)));
  const x = (i) => (i + 0.5) * (W / n);
  const y = (v) => H - (v / max) * H;
  const labels = series[0].points.map((p, i) => ({ i, p })).filter(({ p }) => p.label.startsWith('ene'));
  return (
    <div className="chart">
      <div className="chart-y"><span>{Math.round(max).toLocaleString('es-ES')}</span><span>0</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart-svg" role="img">
        {labels.map(({ i }) => <line key={i} x1={i * (W / n)} x2={i * (W / n)} y1={0} y2={H} className="chart-grid" />)}
        {series.length === 1
          ? series[0].points.map((p, i) =>
              p.v != null ? (
                <rect key={i} x={i * (W / n) + 0.4} y={y(p.v)} width={W / n - 0.8} height={H - y(p.v)} fill={series[0].color}>
                  <title>{`${p.label} · ${Math.round(p.v).toLocaleString('es-ES')} viaj./día`}</title>
                </rect>
              ) : null
            )
          : series.map((s) => {
              const segs = [];
              let cur = [];
              s.points.forEach((p, i) => {
                if (p.v == null) { if (cur.length) segs.push(cur); cur = []; }
                else cur.push(`${x(i)},${y(p.v)}`);
              });
              if (cur.length) segs.push(cur);
              return segs.map((pts, k) => (
                <polyline key={`${s.id}-${k}`} fill="none" stroke={s.color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" points={pts.join(' ')} />
              ));
            })}
      </svg>
      <div className="chart-x chart-x--years">
        {labels.map(({ i, p }) => (
          <span key={i} style={{ left: `${(i / n) * 100}%` }}>{p.label.slice(4)}</span>
        ))}
      </div>
    </div>
  );
}

/** Valor + posición en la distribución de la red (con la mediana marcada). */
export function PercentileBar({ ind, stat, v, showValue = true }) {
  const p = percentile(stat, v);
  const pos = v != null ? normalize(ind, stat, v) * 100 : null;
  const med = stat.median != null ? normalize(ind, stat, stat.median) * 100 : null;
  const color = colorFor(ind, stat, v);
  return (
    <div className="pbar">
      {showValue && (
        <span className="pbar-val">
          {formatValue(ind, v)}
          {v != null && ind.unit && <span className="muted"> {ind.unit}</span>}
        </span>
      )}
      <span className="pbar-track" title={p != null ? `Percentil ${p} de la red · mediana ${formatValue(ind, stat.median)}` : 'Sin dato'}>
        {med != null && <span className="pbar-median" style={{ left: `${med}%` }} />}
        {pos != null && <span className="pbar-dot" style={{ left: `${pos}%`, background: `rgb(${color.join(',')})` }} />}
      </span>
      <span className="pbar-p muted">{p != null ? `p${p}` : ''}</span>
    </div>
  );
}
