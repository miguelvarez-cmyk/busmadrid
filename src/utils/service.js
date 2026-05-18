/**
 * Mejor exp/h en el rango [startHour, endHour) para un sentido concreto.
 * Devuelve 0 si no hay servicio en el rango para ese sentido.
 */
function bestExpHourlyDir(metrics, routeId, dow, direction, startHour, endHour) {
  const row = metrics?.byRoute?.[routeId]?.[String(dow)]?.[direction];
  if (!row) return 0;
  let best = 0;
  for (let h = startHour; h < endHour; h++) {
    const v = row[h] || 0;
    if (v > best) best = v;
  }
  return best;
}

/**
 * Frecuencia real percibida en una parada de la línea, en minutos.
 *
 * Para cada sentido se toma la "mejor" exp/h (máximo del rango horario) y se
 * deriva la frecuencia: 60 / exp_h. Si la línea tiene los dos sentidos en
 * funcionamiento, la frecuencia mostrada es la media de las dos (esto modela
 * lo que ve un usuario en una parada que sirve ambos sentidos). Si solo opera
 * un sentido, se usa esa frecuencia. Si ninguno opera, Infinity.
 */
export function bestFrequencyMinutes(metrics, routeId, dow, startHour, endHour) {
  if (!metrics || endHour <= startHour) return Infinity;
  const exp0 = bestExpHourlyDir(metrics, routeId, dow, '0', startHour, endHour);
  const exp1 = bestExpHourlyDir(metrics, routeId, dow, '1', startHour, endHour);
  const freqs = [];
  if (exp0 > 0) freqs.push(60 / exp0);
  if (exp1 > 0) freqs.push(60 / exp1);
  if (freqs.length === 0) return Infinity;
  return freqs.reduce((a, b) => a + b, 0) / freqs.length;
}

// Categorías de frecuencia (intervalo en minutos -> color RGB)
export const FREQUENCY_CATEGORIES = [
  { maxMin: 5,  label: '≤ 5 min',     color: [27, 94, 32] },     // verde oscuro
  { maxMin: 8,  label: '5–8 min',     color: [102, 187, 106] },  // verde claro
  { maxMin: 15, label: '8–15 min',    color: [255, 210, 63] },   // amarillo
  { maxMin: 20, label: '15–20 min',   color: [255, 153, 51] },   // naranja
  { maxMin: 30, label: '20–30 min',   color: [239, 83, 80] },    // rojo claro
  { maxMin: 45, label: '30–45 min',   color: [160, 20, 20] },    // rojo oscuro
  { maxMin: Infinity, label: '> 45 min', color: [0, 0, 0] },     // negro
];

export const NO_SERVICE_COLOR = [150, 150, 150];

export function frequencyCategory(minutes) {
  if (!isFinite(minutes)) return null;
  for (const cat of FREQUENCY_CATEGORIES) {
    if (minutes <= cat.maxMin) return cat;
  }
  return FREQUENCY_CATEGORIES[FREQUENCY_CATEGORIES.length - 1];
}

export function frequencyColorForRoute(metrics, routeId, dow, startHour, endHour) {
  const min = bestFrequencyMinutes(metrics, routeId, dow, startHour, endHour);
  if (!isFinite(min)) return NO_SERVICE_COLOR;
  return frequencyCategory(min).color;
}

/**
 * Rampa verde → amarillo → rojo para velocidad media. Usa el rango global
 * (min, max) precalculado por compute_speed.py para mantener una escala estable
 * cuando el usuario cambia la selección.
 */
export function speedColor(speedKmh, min, max) {
  if (speedKmh == null || max <= min) return [50, 200, 50];
  const t = Math.max(0, Math.min(1, (speedKmh - min) / (max - min)));
  if (t < 0.5) {
    const k = t / 0.5;
    return [Math.round(50 + 170 * k), 200, 50];
  }
  const k = (t - 0.5) / 0.5;
  return [220, Math.round(200 - 150 * k), 50];
}

export function speedColorForRoute(speeds, routeId) {
  if (!speeds) return NO_SERVICE_COLOR;
  const entry = speeds.byRoute?.[routeId];
  if (!entry) return NO_SERVICE_COLOR;
  return speedColor(entry.speedKmh, speeds.min, speeds.max);
}

/**
 * Cuenta cuántas líneas de un set caen en cada categoría de frecuencia
 * (las 7 categorías + "no opera"). Devuelve buckets aptos para Histogram,
 * marcando cuáles caen dentro del rango [minMin, maxMin] de filtrado.
 */
export function frequencyHistogram(metrics, routeIds, dow, startHour, endHour, filter) {
  const counts = FREQUENCY_CATEGORIES.map(() => 0);
  let noService = 0;
  for (const id of routeIds) {
    const min = bestFrequencyMinutes(metrics, id, dow, startHour, endHour);
    if (!isFinite(min)) {
      noService += 1;
      continue;
    }
    const idx = FREQUENCY_CATEGORIES.findIndex((c) => min <= c.maxMin);
    counts[idx >= 0 ? idx : counts.length - 1] += 1;
  }

  const [fMin, fMax] = filter;
  const inFilter = (lo, hi) => {
    // bucket [lo, hi] está dentro si su intervalo cae en [fMin, fMax]
    const bucketHi = isFinite(hi) ? hi : Infinity;
    return bucketHi >= fMin && lo <= fMax;
  };

  const buckets = FREQUENCY_CATEGORIES.map((cat, i) => {
    const lo = i === 0 ? 0 : FREQUENCY_CATEGORIES[i - 1].maxMin;
    return {
      label: cat.label,
      count: counts[i],
      color: cat.color,
      inRange: inFilter(lo, cat.maxMin),
    };
  });
  buckets.push({
    label: 'No opera',
    count: noService,
    color: NO_SERVICE_COLOR,
    inRange: fMax >= 60, // "no opera" se incluye solo si el filtro llega al máximo
  });
  return buckets;
}

/**
 * Buckets de velocidad (5 km/h cada uno) entre min y max globales.
 */
export function speedHistogram(speeds, routeIds, filter) {
  if (!speeds) return [];
  const lo = Math.floor(speeds.min / 5) * 5;
  const hi = Math.ceil(speeds.max / 5) * 5;
  const nBuckets = Math.max(1, (hi - lo) / 5);
  const counts = new Array(nBuckets).fill(0);

  for (const id of routeIds) {
    const entry = speeds.byRoute[id];
    if (!entry) continue;
    const idx = Math.min(nBuckets - 1, Math.floor((entry.speedKmh - lo) / 5));
    if (idx >= 0) counts[idx] += 1;
  }

  const [fMin, fMax] = filter;
  return counts.map((count, i) => {
    const bLo = lo + i * 5;
    const bHi = bLo + 5;
    const mid = bLo + 2.5;
    return {
      label: `${bLo}–${bHi} km/h`,
      count,
      color: speedColor(mid, speeds.min, speeds.max),
      inRange: bHi > fMin && bLo <= fMax,
    };
  });
}

/**
 * Devuelve true si la línea pasa el filtro de frecuencia activo.
 */
export function passesFrequencyFilter(metrics, routeId, dow, startHour, endHour, filter) {
  const [fMin, fMax] = filter;
  const min = bestFrequencyMinutes(metrics, routeId, dow, startHour, endHour);
  if (!isFinite(min)) return fMax >= 60;
  return min >= fMin && min <= fMax;
}

export function passesSpeedFilter(speeds, routeId, filter) {
  if (!speeds) return true;
  const entry = speeds.byRoute[routeId];
  if (!entry) return false;
  const [fMin, fMax] = filter;
  return entry.speedKmh >= fMin && entry.speedKmh <= fMax;
}

/**
 * Gradiente verde → amarillo → rojo para demanda usando escala logarítmica entre min y max globales.
 * El rango de viajeros/día es muy amplio (decenas a 100k+), una escala lineal
 * aplastaría todas las líneas pequeñas en el rojo.
 */
export function demandColor(dailyAvg, min, max) {
  if (dailyAvg == null || dailyAvg <= 0) return NO_SERVICE_COLOR;
  if (max <= min) return [50, 200, 50];
  const lMin = Math.log10(Math.max(1, min));
  const lMax = Math.log10(Math.max(2, max));
  const t = Math.max(0, Math.min(1, (Math.log10(dailyAvg) - lMin) / (lMax - lMin)));
  if (t < 0.5) {
    const k = t / 0.5;
    return [Math.round(50 + 170 * k), 200, 50];
  }
  const k = (t - 0.5) / 0.5;
  return [220, Math.round(200 - 150 * k), 50];
}

export function demandColorForRoute(demand, routeId) {
  if (!demand) return NO_SERVICE_COLOR;
  const entry = demand.byRoute?.[routeId];
  if (!entry) return NO_SERVICE_COLOR;
  return demandColor(entry.dailyAvg, demand.min, demand.max);
}

/**
 * Buckets logarítmicos por orden de magnitud para el histograma de demanda.
 * Cubren desde 0-100 hasta >30k viajeros/día.
 */
const DEMAND_BUCKETS = [
  { lo: 0,      hi: 100,    label: '< 100' },
  { lo: 100,    hi: 300,    label: '100–300' },
  { lo: 300,    hi: 1000,   label: '300–1k' },
  { lo: 1000,   hi: 3000,   label: '1k–3k' },
  { lo: 3000,   hi: 10000,  label: '3k–10k' },
  { lo: 10000,  hi: 30000,  label: '10k–30k' },
  { lo: 30000,  hi: 100000, label: '30k–100k' },
  { lo: 100000, hi: Infinity, label: '> 100k' },
];

export function demandHistogram(demand, routeIds, filter) {
  if (!demand) return [];
  const counts = DEMAND_BUCKETS.map(() => 0);
  for (const id of routeIds) {
    const entry = demand.byRoute[id];
    if (!entry) continue;
    const i = DEMAND_BUCKETS.findIndex((b) => entry.dailyAvg < b.hi);
    counts[i >= 0 ? i : counts.length - 1] += 1;
  }
  const [fMin, fMax] = filter;
  return DEMAND_BUCKETS.map((b, i) => {
    const mid = b.hi === Infinity ? b.lo * 1.5 : (b.lo + b.hi) / 2;
    return {
      label: b.label,
      count: counts[i],
      color: demandColor(mid, demand.min, demand.max),
      inRange: b.lo <= fMax && (b.hi === Infinity ? true : b.hi > fMin),
    };
  });
}

export function passesDemandFilter(demand, routeId, filter) {
  if (!demand) return true;
  const entry = demand.byRoute[routeId];
  if (!entry) return false;
  const [fMin, fMax] = filter;
  return entry.dailyAvg >= fMin && entry.dailyAvg <= fMax;
}

/**
 * Gradiente verde → amarillo → rojo para tamaño de flota. Usa el rango global
 * (min, max) precalculado por compute_fleet.py para mantener una escala
 * estable cuando el usuario cambia la selección o el tipo de día.
 */
export function fleetColor(buses, min, max) {
  if (buses == null || buses <= 0) return NO_SERVICE_COLOR;
  if (max <= min) return [50, 200, 50];
  const t = Math.max(0, Math.min(1, (buses - min) / (max - min)));
  if (t < 0.5) {
    const k = t / 0.5;
    return [Math.round(50 + 170 * k), 200, 50];
  }
  const k = (t - 0.5) / 0.5;
  return [220, Math.round(200 - 150 * k), 50];
}

export function fleetForRoute(fleet, routeId, dayType) {
  const entry = fleet?.byRoute?.[routeId];
  if (!entry) return null;
  const v = entry[dayType];
  return v && v > 0 ? v : null;
}

export function fleetColorForRoute(fleet, routeId, dayType) {
  if (!fleet) return NO_SERVICE_COLOR;
  const v = fleetForRoute(fleet, routeId, dayType);
  if (v == null) return NO_SERVICE_COLOR;
  return fleetColor(v, fleet.min, fleet.max);
}

/**
 * Buckets de flota de tamaño fijo (3 buses cada uno) entre min y max globales.
 * Incluye un bucket extra "Sin datos" para líneas sin flota en el tipo de día.
 */
export function fleetHistogram(fleet, routeIds, dayType, filter) {
  if (!fleet) return [];
  const step = 3;
  const lo = Math.floor(fleet.min / step) * step;
  const hi = Math.ceil((fleet.max + 0.001) / step) * step;
  const nBuckets = Math.max(1, Math.round((hi - lo) / step));
  const counts = new Array(nBuckets).fill(0);
  let noData = 0;

  for (const id of routeIds) {
    const v = fleetForRoute(fleet, id, dayType);
    if (v == null) {
      noData += 1;
      continue;
    }
    const idx = Math.min(nBuckets - 1, Math.floor((v - lo) / step));
    if (idx >= 0) counts[idx] += 1;
  }

  const [fMin, fMax] = filter;
  const buckets = counts.map((count, i) => {
    const bLo = lo + i * step;
    const bHi = bLo + step;
    const mid = bLo + step / 2;
    return {
      label: `${bLo}–${bHi}`,
      count,
      color: fleetColor(mid, fleet.min, fleet.max),
      inRange: bHi > fMin && bLo <= fMax,
    };
  });
  buckets.push({
    label: 'Sin datos',
    count: noData,
    color: NO_SERVICE_COLOR,
    inRange: fMin <= 0,
  });
  return buckets;
}

export function passesFleetFilter(fleet, routeId, dayType, filter) {
  if (!fleet) return true;
  const v = fleetForRoute(fleet, routeId, dayType);
  const [fMin, fMax] = filter;
  if (v == null) return fMin <= 0;
  return v >= fMin && v <= fMax;
}

/**
 * 7 categorías de tortuosidad. Rampa de verde oscuro a rojo oscuro pasando
 * por amarillo. Las primeras 6 cubren el rango habitual 1.0–2.5 y la última
 * agrupa todas las líneas circulares (> 2.5).
 */
export const TORTUOSITY_CATEGORIES = [
  { maxRatio: 1.25, label: '1.00–1.25', color: [27, 94, 32] },     // verde oscuro
  { maxRatio: 1.50, label: '1.25–1.50', color: [102, 187, 106] },  // verde claro
  { maxRatio: 1.75, label: '1.50–1.75', color: [205, 220, 57] },   // verde-amarillo
  { maxRatio: 2.00, label: '1.75–2.00', color: [255, 210, 63] },   // amarillo
  { maxRatio: 2.25, label: '2.00–2.25', color: [255, 153, 51] },   // naranja
  { maxRatio: 2.50, label: '2.25–2.50', color: [239, 83, 80] },    // rojo claro
  { maxRatio: Infinity, label: '> 2.50', color: [127, 20, 20] },   // rojo oscuro
];

const TORTUOSITY_LO = 1.0;

export function tortuosityForRoute(tortuosity, routeId) {
  return tortuosity?.byRoute?.[routeId]?.tortuosity ?? null;
}

export function tortuosityCategory(ratio) {
  if (ratio == null) return null;
  for (const cat of TORTUOSITY_CATEGORIES) {
    if (ratio <= cat.maxRatio) return cat;
  }
  return TORTUOSITY_CATEGORIES[TORTUOSITY_CATEGORIES.length - 1];
}

export function tortuosityColorForRoute(tortuosity, routeId) {
  if (!tortuosity) return NO_SERVICE_COLOR;
  const v = tortuosityForRoute(tortuosity, routeId);
  if (v == null) return NO_SERVICE_COLOR;
  return tortuosityCategory(v).color;
}

export function tortuosityHistogram(tortuosity, routeIds, filter) {
  if (!tortuosity) return [];
  const counts = TORTUOSITY_CATEGORIES.map(() => 0);
  let noData = 0;

  for (const id of routeIds) {
    const v = tortuosityForRoute(tortuosity, id);
    if (v == null) {
      noData += 1;
      continue;
    }
    const idx = TORTUOSITY_CATEGORIES.findIndex((c) => v <= c.maxRatio);
    counts[idx >= 0 ? idx : counts.length - 1] += 1;
  }

  const [fMin, fMax] = filter;
  const inFilter = (lo, hi) => {
    const bucketHi = isFinite(hi) ? hi : Infinity;
    return bucketHi >= fMin && lo <= fMax;
  };

  const buckets = TORTUOSITY_CATEGORIES.map((cat, i) => {
    const lo = i === 0 ? TORTUOSITY_LO : TORTUOSITY_CATEGORIES[i - 1].maxRatio;
    return {
      label: cat.label,
      count: counts[i],
      color: cat.color,
      inRange: inFilter(lo, cat.maxRatio),
    };
  });
  if (noData > 0) {
    buckets.push({
      label: 'Sin datos',
      count: noData,
      color: NO_SERVICE_COLOR,
      inRange: fMin <= TORTUOSITY_LO,
    });
  }
  return buckets;
}

export function passesTortuosityFilter(tortuosity, routeId, filter) {
  if (!tortuosity) return true;
  const v = tortuosityForRoute(tortuosity, routeId);
  const [fMin, fMax] = filter;
  if (v == null) return fMin <= TORTUOSITY_LO;
  return v >= fMin && v <= fMax;
}

// ── Amplitud de horario de servicio ──────────────────────────────────────────

/**
 * Amplitud de servicio en minutos para una línea y tipo de día.
 * Devuelve null si la línea no opera ese tipo de día.
 */
export function scheduleSpanForRoute(schedule, routeId, dayType) {
  return schedule?.byRoute?.[routeId]?.[dayType] ?? null;
}

/**
 * Rampa verde → amarillo → rojo para amplitud de horario.
 * Más horas de servicio = más verde.
 */
export function scheduleColor(spanMin, min, max) {
  if (spanMin == null || spanMin <= 0) return NO_SERVICE_COLOR;
  if (max <= min) return [50, 200, 50];
  const t = Math.max(0, Math.min(1, (spanMin - min) / (max - min)));
  if (t < 0.5) {
    const k = t / 0.5;
    return [Math.round(50 + 170 * k), 200, 50];
  }
  const k = (t - 0.5) / 0.5;
  return [220, Math.round(200 - 150 * k), 50];
}

export function scheduleColorForRoute(schedule, routeId, dayType) {
  if (!schedule) return NO_SERVICE_COLOR;
  const v = scheduleSpanForRoute(schedule, routeId, dayType);
  if (v == null) return NO_SERVICE_COLOR;
  return scheduleColor(v, schedule.min, schedule.max);
}

/**
 * Formatea minutos como "Xh Ymin" (o "Xh" si los minutos son 0).
 */
export function formatSpanMinutes(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Buckets de 60 minutos (1 hora) para el histograma de amplitud de servicio.
 * Incluye "Sin servicio" para líneas sin datos en el tipo de día activo.
 */
export function scheduleHistogram(schedule, routeIds, dayType, filter) {
  if (!schedule) return [];
  const step = 60;
  const lo = Math.floor(schedule.min / step) * step;
  const hi = Math.ceil((schedule.max + 0.001) / step) * step;
  const nBuckets = Math.max(1, Math.round((hi - lo) / step));
  const counts = new Array(nBuckets).fill(0);
  let noData = 0;

  for (const id of routeIds) {
    const v = scheduleSpanForRoute(schedule, id, dayType);
    if (v == null) {
      noData += 1;
      continue;
    }
    const idx = Math.min(nBuckets - 1, Math.floor((v - lo) / step));
    if (idx >= 0) counts[idx] += 1;
  }

  const [fMin, fMax] = filter;
  const buckets = counts.map((count, i) => {
    const bLo = lo + i * step;
    const bHi = bLo + step;
    const mid = bLo + step / 2;
    return {
      label: `${Math.round(bLo / 60)}–${Math.round(bHi / 60)}h`,
      count,
      color: scheduleColor(mid, schedule.min, schedule.max),
      inRange: bHi > fMin && bLo <= fMax,
    };
  });
  if (noData > 0) {
    buckets.push({
      label: 'Sin servicio',
      count: noData,
      color: NO_SERVICE_COLOR,
      inRange: fMin <= 0,
    });
  }
  return buckets;
}

export function passesScheduleFilter(schedule, routeId, dayType, filter) {
  if (!schedule) return true;
  const v = scheduleSpanForRoute(schedule, routeId, dayType);
  const [fMin, fMax] = filter;
  if (v == null) return fMin <= 0;
  return v >= fMin && v <= fMax;
}

/**
 * Rango de horario (primera y última expedición) para una línea en un día específico.
 * Usa serviceMetrics para derivar el primer y último slot con servicio.
 * Devuelve string formato "06:00 – 23:00" o null si no hay servicio.
 */
export function scheduleRangeFromMetrics(metrics, routeId, dayOfWeek) {
  const row = metrics?.byRoute?.[routeId]?.[String(dayOfWeek)];
  if (!row) return null;

  // Unión de los dos sentidos: busca qué horas tienen expediciones en 0 o 1
  const slotsWithService = [];
  for (let h = 0; h < 24; h++) {
    const count0 = row['0']?.[h] ?? 0;
    const count1 = row['1']?.[h] ?? 0;
    if (count0 + count1 > 0) {
      slotsWithService.push(h);
    }
  }

  if (slotsWithService.length === 0) return null;

  const first = Math.min(...slotsWithService);
  const last = Math.max(...slotsWithService);
  const firstStr = String(first).padStart(2, '0');
  const lastStr = String(last).padStart(2, '0');

  return `${firstStr}:00 – ${lastStr}:00`;
}

// ── Líneas por parada ─────────────────────────────────────────────────────────

/**
 * Número de líneas que sirven una parada.
 */
export function stopRouteCount(stop) {
  return stop?.properties?.routes?.length ?? 0;
}

const STOP_ROUTES_BUCKETS = [
  { lo: 1,  hi: 1,  label: '1' },
  { lo: 2,  hi: 2,  label: '2' },
  { lo: 3,  hi: 3,  label: '3' },
  { lo: 4,  hi: 4,  label: '4' },
  { lo: 5,  hi: 5,  label: '5' },
  { lo: 6,  hi: 10, label: '6–10' },
  { lo: 11, hi: Infinity, label: '11+' },
];

/**
 * Color para el histograma de paradas: gradiente verde→amarillo→rojo según líneas.
 * Mapea el count (1–11+) a un valor de intensidad para el gradiente.
 */
function stopRoutesColor(count) {
  const STOP_ROUTES_MAX = 11;
  const t = Math.min(1, Math.max(0, (count - 1) / (STOP_ROUTES_MAX - 1)));

  if (t < 0.5) {
    const k = t / 0.5;
    return [
      Math.round(50 + 205 * k),
      Math.round(200),
      50,
    ];
  }
  const k = (t - 0.5) / 0.5;
  return [
    Math.round(255 - 35 * k),
    Math.round(200 - 150 * k),
    50,
  ];
}

/**
 * Histograma de paradas agrupadas por número de líneas.
 */
export function stopRoutesHistogram(stopsGeojson, filter) {
  if (!stopsGeojson) return [];
  const counts = STOP_ROUTES_BUCKETS.map(() => 0);
  for (const f of stopsGeojson.features) {
    const n = stopRouteCount(f);
    if (n < 1) continue;
    const i = STOP_ROUTES_BUCKETS.findIndex((b) => n >= b.lo && n <= b.hi);
    if (i >= 0) counts[i] += 1;
  }
  const [fMin, fMax] = filter;
  return STOP_ROUTES_BUCKETS.map((b, i) => ({
    label: b.label,
    count: counts[i],
    color: stopRoutesColor(b.hi === Infinity ? b.lo : Math.round((b.lo + b.hi) / 2)),
    inRange: b.lo <= fMax && (b.hi === Infinity ? true : b.hi >= fMin),
  }));
}

export function passesStopRoutesFilter(stop, filter) {
  const [fMin, fMax] = filter;
  const n = stopRouteCount(stop);
  return n >= fMin && n <= fMax;
}

// ── Cobertura poblacional por línea ─────────────────────────────────────────

const NO_COVERAGE_COLOR = [150, 150, 150];

function coverageGradient(t) {
  if (t < 0.5) {
    const k = t / 0.5;
    return [Math.round(50 + 170 * k), 200, 50];
  }
  const k = (t - 0.5) / 0.5;
  return [220, Math.round(200 - 150 * k), 50];
}

export function coverageColorForRoute(routeCoverage, routeId, distance) {
  const entry = routeCoverage?.byRoute?.[routeId];
  if (!entry) return NO_COVERAGE_COLOR;
  const val = entry[String(distance)] ?? 0;
  const minVal = routeCoverage[`min_${distance}`] ?? 0;
  const maxVal = routeCoverage[`max_${distance}`] ?? val;
  const t = maxVal > minVal ? Math.min((val - minVal) / (maxVal - minVal), 1) : 0;
  return coverageGradient(t);
}

export function passesCoverageFilter(routeCoverage, routeId, distance, filter) {
  const entry = routeCoverage?.byRoute?.[routeId];
  if (!entry) return false;
  const val = entry[String(distance)] ?? 0;
  return val >= filter[0] && val <= filter[1];
}

const COVERAGE_BUCKETS = [
  { lo: 0, hi: 1_000, label: '< 1k' },
  { lo: 1_000, hi: 3_000, label: '1k–3k' },
  { lo: 3_000, hi: 10_000, label: '3k–10k' },
  { lo: 10_000, hi: 30_000, label: '10k–30k' },
  { lo: 30_000, hi: 100_000, label: '30k–100k' },
  { lo: 100_000, hi: 200_000, label: '100k–200k' },
  { lo: 200_000, hi: 500_000, label: '200k–500k' },
  { lo: 500_000, hi: Infinity, label: '> 500k' },
];

export function coverageHistogram(routeCoverage, routeIds, distance, filter) {
  if (!routeCoverage) return [];
  const minVal = routeCoverage[`min_${distance}`] ?? 0;
  const maxVal = routeCoverage[`max_${distance}`] ?? 1;
  const counts = COVERAGE_BUCKETS.map(() => 0);
  for (const id of routeIds) {
    const entry = routeCoverage.byRoute?.[id];
    if (!entry) continue;
    const val = entry[String(distance)] ?? 0;
    const i = COVERAGE_BUCKETS.findIndex((b) => val >= b.lo && val < b.hi);
    if (i >= 0) counts[i] += 1;
  }
  const [fMin, fMax] = filter;
  return COVERAGE_BUCKETS.map((b, i) => {
    const mid = b.hi === Infinity ? b.lo : (b.lo + b.hi) / 2;
    const t = maxVal > minVal ? Math.min((mid - minVal) / (maxVal - minVal), 1) : 0;
    return {
      label: b.label,
      count: counts[i],
      color: coverageGradient(Math.max(0, t)),
      inRange: b.lo <= fMax && (b.hi === Infinity ? b.lo >= fMin : b.hi > fMin),
    };
  });
}

// ---------------------------------------------------------------------------
// Histograma de líneas por edificio (visualización buildingCoverageMode)
// Gradiente inverso: rojo(pocas líneas) → verde(muchas líneas), gris(0)
// ---------------------------------------------------------------------------

function buildingLineBucketColor(nLineas, maxLineas) {
  if (nLineas === 0) return [100, 100, 100];
  const t = Math.min(nLineas / maxLineas, 1);
  if (t < 0.5) {
    const k = t / 0.5;
    return [220, Math.round(50 + 150 * k), 50];
  }
  const k = (t - 0.5) / 0.5;
  return [Math.round(220 - 170 * k), 200, 50];
}

const BUILDING_LINE_BUCKETS = [
  { label: '0',     min: 0,  max: 0  },
  { label: '1',     min: 1,  max: 1  },
  { label: '2',     min: 2,  max: 2  },
  { label: '3–6',   min: 3,  max: 6  },
  { label: '7–12',  min: 7,  max: 12 },
  { label: '13–20', min: 13, max: 20 },
  { label: '+20',   min: 21, max: Infinity },
];
const BUILDING_LINE_MAX_REF = 21;

// ── Divergencia ida/vuelta ────────────────────────────────────────────────────

export const DIVERGENCE_CATEGORIES = [
  { maxPct:  15, label: '0–15 %',   color: [27,  94,  32] },   // verde oscuro
  { maxPct:  30, label: '15–30 %',  color: [102, 187, 106] },  // verde claro
  { maxPct:  45, label: '30–45 %',  color: [205, 220,  57] },  // verde-amarillo
  { maxPct:  60, label: '45–60 %',  color: [255, 210,  63] },  // amarillo
  { maxPct:  75, label: '60–75 %',  color: [255, 153,  51] },  // naranja
  { maxPct:  90, label: '75–90 %',  color: [239,  83,  80] },  // rojo claro
  { maxPct: 100, label: '90–100 %', color: [127,  20,  20] },  // rojo oscuro
];

export function divergenceForRoute(divergence, routeId) {
  return divergence?.byRoute?.[routeId]?.divergence ?? null;
}

export function divergenceCategory(pct) {
  if (pct == null) return null;
  for (const cat of DIVERGENCE_CATEGORIES) {
    if (pct <= cat.maxPct) return cat;
  }
  return DIVERGENCE_CATEGORIES[DIVERGENCE_CATEGORIES.length - 1];
}

export function divergenceColorForRoute(divergence, routeId) {
  if (!divergence) return NO_SERVICE_COLOR;
  const v = divergenceForRoute(divergence, routeId);
  if (v == null) return NO_SERVICE_COLOR;
  return divergenceCategory(v).color;
}

export function divergenceHistogram(divergence, routeIds, filter) {
  if (!divergence) return [];
  const counts = DIVERGENCE_CATEGORIES.map(() => 0);
  let noData = 0;

  for (const id of routeIds) {
    const v = divergenceForRoute(divergence, id);
    if (v == null) {
      noData += 1;
      continue;
    }
    const idx = DIVERGENCE_CATEGORIES.findIndex((c) => v <= c.maxPct);
    counts[idx >= 0 ? idx : counts.length - 1] += 1;
  }

  const [fMin, fMax] = filter;
  const buckets = DIVERGENCE_CATEGORIES.map((cat, i) => {
    const lo = i === 0 ? 0 : DIVERGENCE_CATEGORIES[i - 1].maxPct;
    return {
      label: cat.label,
      count: counts[i],
      color: cat.color,
      inRange: cat.maxPct >= fMin && lo <= fMax,
    };
  });
  if (noData > 0) {
    buckets.push({
      label: 'Sin datos',
      count: noData,
      color: NO_SERVICE_COLOR,
      inRange: fMin <= 0,
    });
  }
  return buckets;
}

export function passesDivergenceFilter(divergence, routeId, filter) {
  if (!divergence) return true;
  const v = divergenceForRoute(divergence, routeId);
  const [fMin, fMax] = filter;
  if (v == null) return fMin <= 0;
  return v >= fMin && v <= fMax;
}

// ── Longitud media del recorrido ──────────────────────────────────────────────

export const LENGTH_CATEGORIES = [
  { maxKm:  5, label: '< 5 km',    color: [27,  94,  32] },   // verde oscuro
  { maxKm:  8, label: '5–8 km',    color: [102, 187, 106] },  // verde claro
  { maxKm: 10, label: '8–10 km',   color: [205, 220,  57] },  // verde-amarillo
  { maxKm: 12, label: '10–12 km',  color: [255, 210,  63] },  // amarillo
  { maxKm: 15, label: '12–15 km',  color: [255, 153,  51] },  // naranja
  { maxKm: 18, label: '15–18 km',  color: [239,  83,  80] },  // rojo claro
  { maxKm: Infinity, label: '> 18 km', color: [127,  20,  20] }, // rojo oscuro
];

export function lengthForRoute(tortuosity, routeId) {
  return tortuosity?.byRoute?.[routeId]?.lengthKm ?? null;
}

export function lengthColorForRoute(tortuosity, routeId) {
  if (!tortuosity) return NO_SERVICE_COLOR;
  const v = lengthForRoute(tortuosity, routeId);
  if (v == null) return NO_SERVICE_COLOR;
  for (const cat of LENGTH_CATEGORIES) {
    if (v <= cat.maxKm) return cat.color;
  }
  return LENGTH_CATEGORIES[LENGTH_CATEGORIES.length - 1].color;
}

export function lengthHistogram(tortuosity, routeIds, filter) {
  if (!tortuosity) return [];
  const counts = LENGTH_CATEGORIES.map(() => 0);
  let noData = 0;

  for (const id of routeIds) {
    const v = lengthForRoute(tortuosity, id);
    if (v == null) {
      noData += 1;
      continue;
    }
    const idx = LENGTH_CATEGORIES.findIndex((c) => v <= c.maxKm);
    counts[idx >= 0 ? idx : counts.length - 1] += 1;
  }

  const [fMin, fMax] = filter;
  const inFilter = (lo, hi) => {
    const bucketHi = isFinite(hi) ? hi : Infinity;
    return bucketHi >= fMin && lo <= fMax;
  };

  const buckets = LENGTH_CATEGORIES.map((cat, i) => {
    const lo = i === 0 ? 0 : LENGTH_CATEGORIES[i - 1].maxKm;
    return {
      label: cat.label,
      count: counts[i],
      color: cat.color,
      inRange: inFilter(lo, cat.maxKm),
    };
  });
  if (noData > 0) {
    buckets.push({
      label: 'Sin datos',
      count: noData,
      color: NO_SERVICE_COLOR,
      inRange: fMin <= 0,
    });
  }
  return buckets;
}

export function passesLengthFilter(tortuosity, routeId, filter) {
  if (!tortuosity) return true;
  const v = lengthForRoute(tortuosity, routeId);
  const [fMin, fMax] = filter;
  if (v == null) return fMin <= 0;
  return v >= fMin && v <= fMax;
}

export function buildingLineHistogram(geojson) {
  if (!geojson?.features?.length) return [];

  return BUILDING_LINE_BUCKETS.map(({ label, min, max }) => {
    const count = geojson.features.filter(
      (f) => (f.properties.n_lineas ?? 0) >= min && (f.properties.n_lineas ?? 0) <= max
    ).length;
    const mid = min === max ? min : Math.round((min + Math.min(max, BUILDING_LINE_MAX_REF)) / 2);
    return {
      label,
      count,
      color: buildingLineBucketColor(mid, BUILDING_LINE_MAX_REF),
      inRange: true,
    };
  });
}
