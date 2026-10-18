import {
  INDICATORS,
  DAY_TYPES,
  DAY_TYPE_BY_ID,
  labelWithUnit,
  contextLabel,
  expeditionsByHourBoth,
  paxByHour,
  pad2,
} from './indicators.js';

// CSV para Excel en español: separador ';', coma decimal y BOM UTF-8.
function cell(v) {
  if (v == null || (typeof v === 'number' && !isFinite(v))) return '';
  if (typeof v === 'number') return String(Math.round(v * 1e5) / 1e5).replace('.', ',');
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(filename, rows) {
  const text = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ctxSlug(ctx) {
  return `${ctx.dayType}_${pad2(ctx.startHour)}-${pad2(ctx.endHour)}h_${ctx.year}`;
}

/** Tabla de líneas visible: todos los indicadores en el contexto activo. */
export function exportLinesCsv({ routeIds, metaById, values, ctx, demand }) {
  const header = ['Línea', 'Nombre', 'route_id'];
  for (const ind of INDICATORS) {
    const c = contextLabel(ind, ctx, demand);
    header.push(c ? `${labelWithUnit(ind, ctx)} [${c}]` : labelWithUnit(ind, ctx));
  }
  const rows = [header];
  for (const id of routeIds) {
    const m = metaById[id];
    rows.push([m?.shortName ?? id, m?.longName ?? '', id, ...INDICATORS.map((ind) => values[id]?.[ind.id])]);
  }
  download(`busmadrid_lineas_${ctxSlug(ctx)}.csv`, rows);
}

/** Perfiles horarios por línea y tipo de día. */
export function exportHourlyCsv({ routeIds, metaById, data }) {
  const rows = [['Línea', 'route_id', 'Tipo de día', 'Hora', 'Expediciones (ambos sentidos)', 'Viajeros subidos', 'Viajeros/expedición']];
  for (const id of routeIds) {
    for (const d of DAY_TYPES) {
      const exp = expeditionsByHourBoth(data.serviceMetrics, id, d.id);
      const pax = paxByHour(data.routeLoadHourly, id, d.id);
      if (!exp && !pax) continue;
      for (let h = 0; h < 24; h++) {
        const e = exp?.[h] ?? null;
        const p = pax?.[h] ?? null;
        rows.push([metaById[id]?.shortName ?? id, id, DAY_TYPE_BY_ID[d.id].label, `${pad2(h)}:00`, e, p, e > 0 && p != null ? p / e : null]);
      }
    }
  }
  const tag = routeIds.length === 1 ? metaById[routeIds[0]]?.shortName ?? routeIds[0] : `${routeIds.length}lineas`;
  download(`busmadrid_perfiles_horarios_${tag}.csv`, rows);
}

/** Paradas servidas por las líneas dadas. */
export function exportStopsCsv({ stopsGeojson, stopExpeditions, routeIdSet, metaById }) {
  const rows = [['stop_id', 'Código', 'Nombre', 'Longitud', 'Latitud', 'Nº líneas', 'Líneas', 'Expediciones en la hora punta laborable']];
  for (const f of stopsGeojson.features) {
    const p = f.properties;
    if (!p.routes.some((r) => routeIdSet.has(r))) continue;
    const lines = p.routes.map((r) => metaById[r]?.shortName ?? r).join(' ');
    rows.push([p.stop_id, p.stop_code, p.stop_name, f.geometry.coordinates[0], f.geometry.coordinates[1],
      p.routes.length, lines, stopExpeditions?.byStop?.[p.stop_id]?.peak ?? null]);
  }
  download('busmadrid_paradas.csv', rows);
}
