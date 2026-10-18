import { useMemo } from 'react';
import { useMapStore, usePinnedRouteIds, usePanelWide, useClickedRouteId, MAX_PINNED } from '../store/useMapStore.js';
import {
  GROUPS,
  INDICATORS,
  DAY_TYPES,
  DAY_TYPE_BY_ID,
  contextLabel,
  expeditionsByHourBoth,
  loadProfile,
  colorFor,
  INDICATOR_BY_ID,
  hourRangeLabel,
  fmtNum,
  SERIES_COLORS,
} from '../utils/indicators.js';
import { useNetwork } from '../utils/network.js';
import { exportHourlyCsv } from '../utils/csv.js';
import { HourChart, MonthChart, PercentileBar } from './charts.jsx';
import InfoTip from './InfoTip.jsx';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function bbox(geojson, ids) {
  const set = new Set(ids);
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of geojson.features) {
    if (!set.has(f.properties.route_id)) continue;
    const lines = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const line of lines) {
      for (const [lon, lat] of line) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return minLon === Infinity ? null : { minLon, maxLon, minLat, maxLat };
}

function monthlyPoints(monthly) {
  if (!monthly) return [];
  const pts = [];
  for (const year of Object.keys(monthly).sort()) {
    monthly[year].forEach((v, i) => pts.push({ label: `${MONTHS[i]} ${year}`, v: v ?? null }));
  }
  while (pts.length && pts[pts.length - 1].v == null) pts.pop();
  return pts;
}

export default function Ficha() {
  const { data, metaById, values, stats, ctx, fichaIds } = useNetwork();
  const pinned = usePinnedRouteIds();
  const clicked = useClickedRouteId();
  const wide = usePanelWide();
  const { togglePin, closeFicha, setClickedRouteId, setPinnedRouteIds, setPanelWide, setViewState } = useMapStore.getState();
  const multi = fichaIds.length > 1;
  const colorOf = (i) => (multi ? SERIES_COLORS[i % SERIES_COLORS.length] : '#2D8EFF');
  const day = DAY_TYPE_BY_ID[ctx.dayType];

  const remove = (id) => {
    if (pinned.includes(id)) setPinnedRouteIds(pinned.filter((x) => x !== id));
    if (clicked === id) setClickedRouteId(null);
    if (fichaIds.length === 1) closeFicha();
  };

  const center = () => {
    const b = bbox(data.routesGeojson, fichaIds);
    if (!b) return;
    const span = Math.max(b.maxLon - b.minLon, (b.maxLat - b.minLat) * 1.3);
    const zoom = Math.min(16, Math.max(10, Math.log2(360 / span) - 0.6));
    setViewState({ longitude: (b.minLon + b.maxLon) / 2, latitude: (b.minLat + b.maxLat) / 2, zoom, pitch: 0, bearing: 0, transitionDuration: 700 });
  };

  const expSeries = useMemo(
    () => fichaIds.map((id, i) => ({ id, color: colorOf(i), values: expeditionsByHourBoth(data.serviceMetrics, id, ctx.dayType) ?? new Array(24).fill(null) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fichaIds, data, ctx.dayType, multi]
  );
  const loadSeries = useMemo(
    () =>
      fichaIds
        .map((id, i) => {
          const prof = loadProfile(data, id, ctx.dayType);
          if (!prof) return null;
          return {
            id,
            color: colorOf(i),
            values: prof.map((p) => p.ratio),
            // Una sola línea: barras coloreadas con la escala de Viajeros/expedición
            barColors: prof.map((p) => `rgb(${colorFor(INDICATOR_BY_ID.load, stats.load, p.ratio).join(',')})`),
          };
        })
        .filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fichaIds, data, ctx.dayType, multi, stats]
  );
  const monthSeries = useMemo(
    () => fichaIds.map((id, i) => ({ id, color: colorOf(i), points: monthlyPoints(data.routeDemand?.byRoute?.[id]?.monthly) })).filter((s) => s.points.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fichaIds, data, multi]
  );

  const loadMeta = data.routeLoadHourly?.meta;

  return (
    <div className="ficha">
      <div className="panel-toolbar">
        <button type="button" className="btn-sm" onClick={closeFicha}>← Tabla</button>
        <div className="panel-title">{multi ? `Comparación · ${fichaIds.length} líneas` : 'Ficha de línea'}</div>
        <span className="spacer" />
        <button type="button" className="btn-sm" onClick={center}>Centrar en mapa</button>
        <button type="button" className="btn-sm" onClick={() => exportHourlyCsv({ routeIds: fichaIds, metaById, data })} title="Perfiles horarios de estas líneas en CSV">↓ CSV horario</button>
        {!multi && <button type="button" className="btn-sm btn-icon" onClick={() => setPanelWide(!wide)} title={wide ? 'Estrechar panel' : 'Ensanchar panel'} aria-label={wide ? 'Estrechar panel' : 'Ensanchar panel'}>
          {wide ? '⇥' : '⇤'}
        </button>}
      </div>

      <div className="ficha-scroll">
        <table className={`ficha-table ${multi ? 'ficha-table--multi' : ''}`}>
          <thead>
            <tr>
              <th className="ficha-label-col" />
              {fichaIds.map((id, i) => {
                const m = metaById[id];
                const isPinned = pinned.includes(id);
                return (
                  <th key={id} className="ficha-line-head">
                    <div className="ficha-line-top">
                      {multi && <i className="series-swatch" style={{ background: colorOf(i) }} />}
                      <span className="swatch" style={{ background: `#${m.color}` }} />
                      <b className="ficha-line-num">{m.shortName}</b>
                      <button
                        type="button"
                        className={`pin ${isPinned ? 'pin--on' : ''}`}
                        onClick={() => togglePin(id)}
                        disabled={!isPinned && pinned.length >= MAX_PINNED}
                        title={isPinned ? 'Desfijar' : 'Fijar para comparar con otras líneas'}
                        aria-pressed={isPinned}
                      >
                        📌
                      </button>
                      <button type="button" className="chip-x" onClick={() => remove(id)} aria-label={`Quitar línea ${m.shortName}`}>×</button>
                    </div>
                    <div className="ficha-line-name">{m.longName}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <FichaGroup key={g.id} group={g} ids={fichaIds} values={values} stats={stats} ctx={ctx} demand={data.routeDemand} />
            ))}
            <tr className="ficha-group"><td colSpan={fichaIds.length + 1}>Servicio · {day.label}</td></tr>
            <tr>
              <td className="ficha-label">Primera – última salida</td>
              {fichaIds.map((id) => {
                const t = data.routeDepartureTimes?.byRoute?.[id]?.[ctx.dayType];
                return <td key={id}>{t ? `${t.primera} – ${t.última}` : '—'}</td>;
              })}
            </tr>
            <tr>
              <td className="ficha-label">Paradas ida / vuelta</td>
              {fichaIds.map((id) => {
                const s = metaById[id].stopsCount;
                return <td key={id}>{s ? `${s['0'] ?? '—'} / ${s['1'] ?? '—'}` : '—'}</td>;
              })}
            </tr>
          </tbody>
        </table>

        {!multi && pinned.length < MAX_PINNED && !pinned.includes(fichaIds[0]) && (
          <p className="ficha-hint muted">📌 Fija esta línea y abre otra para compararlas en columnas.</p>
        )}

        <section className="ficha-chart">
          <h3>Expediciones por hora <span className="muted">· ambos sentidos · {day.label} · franja {hourRangeLabel(ctx.startHour, ctx.endHour)} sombreada</span></h3>
          <HourChart series={expSeries} band={[ctx.startHour, ctx.endHour]} fmt={(v) => fmtNum(v, 0)} />
        </section>

        {loadSeries.length > 0 && (
          <section className="ficha-chart">
            <h3>
              Viajeros/expedición por hora <span className="muted">· {day.label}{loadMeta ? ` · demanda ${loadMeta.year}${loadMeta.excludedMonths?.length ? ' sin julio ni agosto' : ''}` : ''}</span>
            </h3>
            <HourChart series={loadSeries} band={[ctx.startHour, ctx.endHour]} fmt={(v) => fmtNum(v, 0)} />
          </section>
        )}

        {monthSeries.length > 0 && (
          <section className="ficha-chart">
            <h3>Viajeros/día por mes <span className="muted">· todos los días</span></h3>
            <MonthChart series={monthSeries} />
          </section>
        )}

        {multi && (
          <div className="series-legend">
            {fichaIds.map((id, i) => (
              <span key={id}><i className="series-swatch" style={{ background: colorOf(i) }} />{metaById[id].shortName}</span>
            ))}
          </div>
        )}

        <p className="ficha-note muted">
          Barras de percentil: posición de la línea en la red ({Object.keys(values).length} líneas) en el contexto activo; la marca vertical es la mediana.
          {' '}Tipos de día: {DAY_TYPES.map((d) => d.label).join(', ')}.
        </p>
      </div>
    </div>
  );
}

function FichaGroup({ group, ids, values, stats, ctx, demand }) {
  const inds = INDICATORS.filter((i) => i.group === group.id);
  return (
    <>
      <tr className="ficha-group"><td colSpan={ids.length + 1}>{group.label}</td></tr>
      {inds.map((ind) => {
        const c = contextLabel(ind, ctx, demand);
        return (
          <tr key={ind.id}>
            <td className="ficha-label">
              <span>{ind.label}</span>
              <InfoTip id={ind.id} />
              {c && <span className="ficha-ctx">{c}</span>}
            </td>
            {ids.map((id) => (
              <td key={id}>
                <PercentileBar ind={ind} stat={stats[ind.id]} v={values[id]?.[ind.id]} />
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
