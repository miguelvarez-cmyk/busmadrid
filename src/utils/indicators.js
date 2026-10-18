/**
 * Registro único de indicadores por línea. Todo lo que muestra la web (mapa,
 * tabla, ficha, CSV, metodología) sale de aquí: añadir un indicador es añadir
 * una entrada a INDICATORS.
 *
 * ctx = { dayType: 'LA'|'SA'|'FE', startHour, endHour, year, radius }
 */

export const DAY_TYPES = [
  { id: 'LA', label: 'Laborable', short: 'Lab.', dows: ['0', '1', '2', '3', '4'] },
  { id: 'SA', label: 'Sábado', short: 'Sáb.', dows: ['5'] },
  { id: 'FE', label: 'Domingo/festivo', short: 'Dom./fest.', dows: ['6'] },
];
export const DAY_TYPE_BY_ID = Object.fromEntries(DAY_TYPES.map((d) => [d.id, d]));

export const GROUPS = [
  { id: 'oferta', label: 'Oferta' },
  { id: 'demanda', label: 'Demanda' },
  { id: 'rendimiento', label: 'Rendimiento' },
  { id: 'trazado', label: 'Trazado' },
  { id: 'territorio', label: 'Territorio' },
];

export const COVERAGE_RADII = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800];

// ── Utilidades de cálculo ─────────────────────────────────────────────────────

/** Expediciones por hora (24 valores) de un sentido, promediadas entre los días del tipo. */
export function expeditionsByHour(metrics, routeId, dayType, dir) {
  const m = metrics?.byRoute?.[routeId];
  if (!m) return null;
  const dows = DAY_TYPE_BY_ID[dayType].dows;
  const out = new Array(24).fill(0);
  let any = false;
  for (const d of dows) {
    const row = m[d]?.[dir];
    if (!row) continue;
    any = true;
    for (let h = 0; h < 24; h++) out[h] += (row[h] ?? 0) / dows.length;
  }
  return any ? out : null;
}

/** Expediciones por hora sumando ambos sentidos. */
export function expeditionsByHourBoth(metrics, routeId, dayType) {
  const a = expeditionsByHour(metrics, routeId, dayType, '0');
  const b = expeditionsByHour(metrics, routeId, dayType, '1');
  if (!a && !b) return null;
  return Array.from({ length: 24 }, (_, h) => (a?.[h] ?? 0) + (b?.[h] ?? 0));
}

/** Viajeros por hora (24 valores) del fichero de carga horaria. */
export function paxByHour(load, routeId, dayType) {
  return load?.byRoute?.[routeId]?.[dayType] ?? null;
}

/** Viajeros por expedición en cada hora: [{ hour, pax, exp, ratio }]. */
export function loadProfile(data, routeId, dayType) {
  const pax = paxByHour(data.routeLoadHourly, routeId, dayType);
  const exp = expeditionsByHourBoth(data.serviceMetrics, routeId, dayType);
  if (!pax || !exp) return null;
  return pax.map((p, hour) => ({ hour, pax: p, exp: exp[hour], ratio: exp[hour] > 0 ? p / exp[hour] : null }));
}

function demandYearEntry(data, routeId, year) {
  return data.routeDemand?.byRoute?.[routeId]?.byYear?.[year] ?? null;
}

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2025", o "2026 (ene–sep)" si el año de demanda es parcial. */
export function yearLabel(demand, year) {
  const stats = demand?.byYear?.[year];
  if (!stats?.partial) return String(year);
  const from = MONTH_ABBR[Number(stats.from.slice(5, 7)) - 1];
  const to = MONTH_ABBR[Number(stats.to.slice(5, 7)) - 1];
  return `${year} (${from}–${to})`;
}

export function fmtNum(v, decimals = 0) {
  if (v == null || !isFinite(v)) return '—';
  // useGrouping 'always': en es-ES los miles de 4 cifras no se agrupan por defecto
  return v.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always' });
}

export function pad2(h) {
  return String(h).padStart(2, '0');
}

export function hourRangeLabel(startHour, endHour) {
  if (startHour === 0 && endHour === 24) return 'día completo';
  return `${pad2(startHour)}–${pad2(endHour)} h`;
}

// ── Catálogo ──────────────────────────────────────────────────────────────────
// color: 'good-low' | 'good-high' | 'bad-high' | 'neutral' | 'diverging'
// deps:  qué partes del contexto afectan al valor ('day', 'hour', 'year', 'radius')

export const INDICATORS = [
  {
    id: 'interval',
    group: 'oferta',
    label: 'Intervalo medio',
    short: 'Intervalo',
    unit: 'min',
    decimals: 1,
    color: 'good-low',
    domain: [3, 30],
    deps: ['day', 'hour'],
    def: 'Minutos de la franja con servicio ÷ expediciones, por sentido; media de ambos sentidos.',
    method:
      'Para cada sentido se cuentan las horas de la franja con al menos una salida y las expediciones que salen en ellas (GTFS, media de los días del tipo). Intervalo = 60 × horas con servicio ÷ expediciones. Se promedian los sentidos que operan. Las horas sin servicio no se cuentan; una línea sin salidas en la franja queda sin dato.',
    source: 'GTFS EMT',
    value(data, id, c) {
      const vals = [];
      for (const dir of ['0', '1']) {
        const row = expeditionsByHour(data.serviceMetrics, id, c.dayType, dir);
        if (!row) continue;
        let hours = 0, exp = 0;
        for (let h = c.startHour; h < c.endHour; h++) {
          if (row[h] > 0) { hours += 1; exp += row[h]; }
        }
        if (exp > 0) vals.push((60 * hours) / exp);
      }
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    },
  },
  {
    id: 'trips',
    group: 'oferta',
    label: 'Expediciones/día',
    short: 'Exp./día',
    unit: 'exp.',
    decimals: 0,
    color: 'good-high',
    deps: ['day'],
    def: 'Salidas diarias sumando ambos sentidos.',
    method: 'Suma de las expediciones de ambos sentidos en las 24 horas del día, media de los días del tipo (GTFS).',
    source: 'GTFS EMT',
    value(data, id, c) {
      const row = expeditionsByHourBoth(data.serviceMetrics, id, c.dayType);
      if (!row) return null;
      const total = row.reduce((a, b) => a + b, 0);
      return total > 0 ? total : null;
    },
  },
  {
    id: 'span',
    group: 'oferta',
    label: 'Amplitud de servicio',
    short: 'Amplitud',
    unit: 'h',
    decimals: 1,
    color: 'good-high',
    deps: ['day'],
    def: 'Última salida − primera salida desde cada cabecera; media de cabeceras.',
    method: 'Para cada cabecera (sentido) se toma la diferencia entre la última y la primera salida del día; se promedian los dos sentidos (GTFS).',
    source: 'GTFS EMT',
    value(data, id, c) {
      const v = data.routeSchedule?.byRoute?.[id]?.[c.dayType];
      return v ? v / 60 : null;
    },
  },
  {
    id: 'fleet',
    group: 'oferta',
    label: 'Flota',
    short: 'Flota',
    unit: 'buses',
    decimals: 0,
    color: 'neutral',
    deps: ['day'],
    def: 'Máximo de coches asignados a la línea a lo largo del día (flota punta).',
    method: 'Para cada fecha se toma el máximo de coches reales asignados a la línea en las franjas del día (NumCCReal); se promedian las fechas del mismo tipo de día y se redondea.',
    source: 'EMT, coches en circulación por franja (2026)',
    value(data, id, c) {
      const v = data.routeFleet?.byRoute?.[id]?.[c.dayType];
      return v > 0 ? v : null;
    },
  },
  {
    id: 'demand',
    group: 'demanda',
    label: 'Viajeros/día',
    short: 'Viaj./día',
    unit: 'viaj.',
    decimals: 0,
    color: 'neutral',
    scale: 'log',
    deps: ['day', 'year'],
    def: 'Media de viajeros por día del tipo en el año.',
    method: 'Media diaria de viajeros validados por línea. Laborable = media de lunes a viernes; sábado y domingo/festivo comparten la media de fin de semana (la agregación de origen solo distingue laborable/fin de semana). Los festivos entre semana cuentan como laborables.',
    source: 'EMT, demanda por día, línea y franja (datos.emtmadrid.es)',
    value(data, id, c) {
      const entry = data.routeDemand?.byRoute?.[id];
      if (!entry) return null;
      const prof = entry.dowProfile?.[c.year];
      const v = prof ? (c.dayType === 'LA' ? prof.weekday : prof.weekend) : entry.byYear?.[c.year]?.dailyAvg;
      return v > 0 ? v : null;
    },
  },
  {
    id: 'delta',
    group: 'demanda',
    label: 'Δ viajeros interanual',
    short: 'Δ viaj.',
    unit: '%',
    decimals: 1,
    color: 'diverging',
    domain: [-15, 15],
    deps: ['year'],
    def: 'Variación de la media diaria de viajeros respecto al año anterior.',
    method: 'Variación porcentual de la media diaria de viajeros (todos los días) frente al año anterior. En años parciales se compara con el mismo periodo del año anterior.',
    source: 'EMT, demanda por día, línea y franja',
    value(data, id, c) {
      const cur = demandYearEntry(data, id, c.year);
      if (!cur?.dailyAvg) return null;
      const prev = cur.prevSamePeriodAvg ?? demandYearEntry(data, id, String(Number(c.year) - 1))?.dailyAvg;
      return prev ? ((cur.dailyAvg - prev) / prev) * 100 : null;
    },
  },
  {
    id: 'load',
    group: 'demanda',
    label: 'Viajeros/expedición',
    short: 'Viaj./exp.',
    unit: 'viaj.',
    decimals: 0,
    color: 'bad-high',
    domain: [10, 80],
    deps: ['day', 'hour'],
    def: 'Viajeros que suben en la franja ÷ expediciones que salen en ella (ambos sentidos).',
    method: 'Σ viajeros subidos en las horas de la franja ÷ Σ expediciones que salen en esas horas (solo horas con servicio). Mide subidas por expedición, no ocupación a bordo. Con la franja de día completo es el valor diario.',
    source: 'EMT, demanda por franja horaria + GTFS',
    value(data, id, c) {
      const pax = paxByHour(data.routeLoadHourly, id, c.dayType);
      const exp = expeditionsByHourBoth(data.serviceMetrics, id, c.dayType);
      if (!pax || !exp) return null;
      let p = 0, e = 0;
      for (let h = c.startHour; h < c.endHour; h++) {
        if (exp[h] > 0) { p += pax[h]; e += exp[h]; }
      }
      return e > 0 ? p / e : null;
    },
  },
  {
    id: 'speed',
    group: 'rendimiento',
    label: 'Velocidad comercial',
    short: 'Velocidad',
    unit: 'km/h',
    decimals: 1,
    color: 'good-high',
    deps: [],
    def: 'Longitud del sentido ÷ duración mediana de sus expediciones; media de ambos sentidos.',
    method: 'Por sentido: longitud del shape más usado ÷ duración mediana programada de las expediciones (primera a última salida en stop_times). La velocidad de la línea es la media de sus sentidos. Es velocidad programada, no medida.',
    source: 'GTFS EMT',
    value(data, id) {
      return data.routeSpeed?.byRoute?.[id]?.speedKmh ?? null;
    },
  },
  {
    id: 'length',
    group: 'trazado',
    label: 'Longitud',
    short: 'Longitud',
    unit: 'km',
    decimals: 1,
    color: 'neutral',
    deps: [],
    def: '(Longitud de ida + longitud de vuelta) ÷ 2, sobre el trazado real.',
    method: 'Media de la longitud de los dos sentidos medida sobre la geometría (shapes) del GTFS.',
    source: 'GTFS EMT',
    value(data, id) {
      return data.routeTortuosity?.byRoute?.[id]?.lengthKm ?? null;
    },
  },
  {
    id: 'tortuosity',
    group: 'trazado',
    label: 'Tortuosidad',
    short: 'Tortuosidad',
    unit: '',
    decimals: 2,
    color: 'bad-high',
    domain: [1, 3],
    deps: [],
    def: 'Longitud del recorrido ÷ distancia en línea recta entre extremos (media de sentidos).',
    method: 'Cociente entre la longitud del recorrido y la distancia en línea recta entre sus dos extremos, por sentido, promediado. 1,00 = recta. Las líneas circulares dan valores muy altos.',
    source: 'GTFS EMT',
    value(data, id) {
      return data.routeTortuosity?.byRoute?.[id]?.tortuosity ?? null;
    },
  },
  {
    id: 'divergence',
    group: 'trazado',
    label: 'Divergencia ida/vuelta',
    short: 'Divergencia',
    unit: '%',
    decimals: 0,
    color: 'neutral',
    deps: [],
    def: '% del trazado total que recorre solo uno de los dos sentidos.',
    method: 'Porcentaje de la longitud total de la línea que no es compartida por ambos sentidos. 0 % = mismo vial en ida y vuelta.',
    source: 'GTFS EMT',
    value(data, id) {
      return data.routeDivergence?.byRoute?.[id]?.divergence ?? null;
    },
  },
  {
    id: 'coverage',
    group: 'territorio',
    label: 'Población servida',
    short: 'Población',
    unit: 'hab.',
    decimals: 0,
    color: 'good-high',
    deps: ['radius'],
    def: 'Habitantes a menos de R metros caminando de alguna parada de la línea.',
    method: 'Población residente (estructura demográfica por sección censal, asignada a edificios residenciales de OSM) a menos de R metros a pie, sobre la red peatonal de OSM, de alguna parada de la línea.',
    source: 'Ayto. de Madrid (población por sección censal) + OSM + GTFS',
    value(data, id, c) {
      return data.routeCoverage?.byRoute?.[id]?.[String(c.radius)] ?? null;
    },
  },
];

export const INDICATOR_BY_ID = Object.fromEntries(INDICATORS.map((i) => [i.id, i]));

/** Etiqueta con unidad: "Velocidad comercial (km/h)". */
export function labelWithUnit(ind, ctx) {
  const unit = ind.id === 'coverage' && ctx ? `hab. a ${ctx.radius} m` : ind.unit;
  return unit ? `${ind.label} (${unit})` : ind.label;
}

export function formatValue(ind, v) {
  if (v == null || !isFinite(v)) return '—';
  // Evita "-0,0" cuando el valor redondeado es cero
  const k = 10 ** ind.decimals;
  const r = Math.round(v * k) / k || 0;
  const s = fmtNum(r, ind.decimals);
  return ind.id === 'delta' && r > 0 ? `+${s}` : s;
}

/** Contexto que afecta a un indicador, en texto: "Laborable · 07–09 h". */
export function contextLabel(ind, ctx, demand) {
  const parts = [];
  if (ind.deps.includes('day')) parts.push(DAY_TYPE_BY_ID[ctx.dayType].label);
  if (ind.deps.includes('hour')) parts.push(hourRangeLabel(ctx.startHour, ctx.endHour));
  if (ind.deps.includes('year')) parts.push(yearLabel(demand, ctx.year));
  if (ind.deps.includes('radius')) parts.push(`${ctx.radius} m`);
  return parts.join(' · ');
}

// ── Tabla de valores y estadísticos de red ────────────────────────────────────

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Calcula todos los indicadores para todas las líneas del feed.
 * Devuelve { values: { [routeId]: { [indId]: number|null } }, stats: { [indId]: {...} } }.
 * Los estadísticos son de toda la red (no de la selección) para que colores y
 * percentiles no cambien al filtrar.
 */
export function computeIndicators(data, routeIds, ctx) {
  const values = {};
  for (const id of routeIds) {
    const row = {};
    for (const ind of INDICATORS) row[ind.id] = ind.value(data, id, ctx);
    values[id] = row;
  }
  const stats = {};
  for (const ind of INDICATORS) {
    const sorted = routeIds.map((id) => values[id][ind.id]).filter((v) => v != null && isFinite(v)).sort((a, b) => a - b);
    let domain = ind.domain;
    if (!domain) {
      const lo = quantile(sorted, 0.02);
      const hi = quantile(sorted, 0.98);
      domain = lo == null ? [0, 1] : [lo, hi > lo ? hi : lo + 1];
    }
    if (ind.scale === 'log') domain = [Math.max(1, domain[0]), Math.max(2, domain[1])];
    stats[ind.id] = {
      sorted,
      min: sorted[0] ?? null,
      max: sorted[sorted.length - 1] ?? null,
      median: quantile(sorted, 0.5),
      domain,
    };
  }
  return { values, stats };
}

/** Percentil (0–100) de v en la distribución de la red. */
export function percentile(stat, v) {
  if (v == null || !stat?.sorted.length) return null;
  const s = stat.sorted;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid] <= v) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / s.length) * 100);
}

/** Posición normalizada 0–1 de v en el dominio del indicador (log si procede). */
export function normalize(ind, stat, v) {
  const [lo, hi] = stat.domain;
  let t;
  if (ind.scale === 'log') {
    const lv = Math.log10(Math.max(1, v));
    t = (lv - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo));
  } else {
    t = (v - lo) / (hi - lo);
  }
  return Math.max(0, Math.min(1, t));
}

export function denormalize(ind, stat, t) {
  const [lo, hi] = stat.domain;
  if (ind.scale === 'log') return 10 ** (Math.log10(lo) + t * (Math.log10(hi) - Math.log10(lo)));
  return lo + t * (hi - lo);
}

// ── Color ─────────────────────────────────────────────────────────────────────

export const NO_DATA_COLOR = [105, 108, 115];
const GOOD = [50, 200, 50];
const MID = [220, 200, 50];
const BAD = [220, 50, 50];
const NEUTRAL_RAMP = [[45, 85, 150], [90, 160, 230], [205, 235, 255]];
const DIVERGING_MID = [175, 175, 175];

function lerp(a, b, k) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));
}
function ramp3(a, b, c, t) {
  return t < 0.5 ? lerp(a, b, t / 0.5) : lerp(b, c, (t - 0.5) / 0.5);
}

/** Color para una posición normalizada t según la semántica del indicador. */
export function colorAt(ind, t) {
  switch (ind.color) {
    case 'good-low':
    case 'bad-high':
      return ramp3(GOOD, MID, BAD, t);
    case 'good-high':
      return ramp3(GOOD, MID, BAD, 1 - t);
    case 'diverging':
      return t < 0.5 ? lerp(BAD, DIVERGING_MID, t / 0.5) : lerp(DIVERGING_MID, GOOD, (t - 0.5) / 0.5);
    default:
      return ramp3(...NEUTRAL_RAMP, t);
  }
}

export function colorFor(ind, stat, v) {
  if (v == null || !isFinite(v) || !stat) return NO_DATA_COLOR;
  return colorAt(ind, normalize(ind, stat, v));
}

/** CSS linear-gradient de la escala del indicador. */
export function gradientCss(ind) {
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => `rgb(${colorAt(ind, t).join(',')}) ${t * 100}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

// ── Filtros ───────────────────────────────────────────────────────────────────

/** filters = { [indId]: [min|null, max|null] }. Sin dato → no pasa. */
export function passesFilters(row, filters) {
  for (const [indId, [lo, hi]] of Object.entries(filters)) {
    const v = row?.[indId];
    if (v == null || !isFinite(v)) return false;
    if (lo != null && v < lo) return false;
    if (hi != null && v > hi) return false;
  }
  return true;
}

export function filterLabel(ind, [lo, hi]) {
  const u = ind.unit ? ` ${ind.unit}` : '';
  if (lo != null && hi != null) return `${formatValue(ind, lo)}–${formatValue(ind, hi)}${u}`;
  if (lo != null) return `≥ ${formatValue(ind, lo)}${u}`;
  return `≤ ${formatValue(ind, hi)}${u}`;
}

/** Histograma de N cubetas sobre el dominio; extremos absorben lo que queda fuera. */
export function histogram(ind, stat, values, n = 16) {
  const counts = new Array(n).fill(0);
  let noData = 0;
  for (const v of values) {
    if (v == null || !isFinite(v)) { noData += 1; continue; }
    const i = Math.min(n - 1, Math.floor(normalize(ind, stat, v) * n));
    counts[i] += 1;
  }
  const bins = counts.map((count, i) => ({
    count,
    lo: denormalize(ind, stat, i / n),
    hi: denormalize(ind, stat, (i + 1) / n),
    color: colorAt(ind, (i + 0.5) / n),
  }));
  return { bins, noData };
}

/** Orden por defecto al elegir un indicador: lo "peor" arriba. */
export function worstFirstDir(ind) {
  return ind.color === 'good-high' || ind.color === 'diverging' ? 'asc' : 'desc';
}

// Colores para distinguir líneas en la comparación (los corporativos de la EMT
// son casi todos el mismo azul)
export const SERIES_COLORS = ['#4EA8FF', '#FF9F43', '#2ED573', '#FF6B81', '#C56CF0', '#FFD32A'];
