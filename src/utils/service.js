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
 * Rampa rojo → amarillo → verde para velocidad media. Usa el rango global
 * (min, max) precalculado por compute_speed.py para mantener una escala estable
 * cuando el usuario cambia la selección.
 */
export function speedColor(speedKmh, min, max) {
  if (speedKmh == null || max <= min) return [60, 220, 80];
  const t = Math.max(0, Math.min(1, (speedKmh - min) / (max - min)));
  if (t < 0.5) {
    const k = t / 0.5;
    return [220, Math.round(60 + 180 * k), 50];
  }
  const k = (t - 0.5) / 0.5;
  return [Math.round(220 - 180 * k), 240, Math.round(50 + 30 * k)];
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
 * Color para demanda usando escala logarítmica entre min y max globales.
 * El rango de viajeros/día es muy amplio (decenas a 100k+), una escala lineal
 * aplastaría todas las líneas pequeñas en el rojo.
 */
export function demandColor(dailyAvg, min, max) {
  if (dailyAvg == null || dailyAvg <= 0) return NO_SERVICE_COLOR;
  if (max <= min) return [60, 220, 80];
  const lMin = Math.log10(Math.max(1, min));
  const lMax = Math.log10(Math.max(2, max));
  const t = Math.max(0, Math.min(1, (Math.log10(dailyAvg) - lMin) / (lMax - lMin)));
  if (t < 0.5) {
    const k = t / 0.5;
    return [220, Math.round(60 + 180 * k), 50];
  }
  const k = (t - 0.5) / 0.5;
  return [Math.round(220 - 180 * k), 240, Math.round(50 + 30 * k)];
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
 * Rampa rojo → amarillo → verde para tamaño de flota. Usa el rango global
 * (min, max) precalculado por compute_fleet.py para mantener una escala
 * estable cuando el usuario cambia la selección o el tipo de día.
 */
export function fleetColor(buses, min, max) {
  if (buses == null || buses <= 0) return NO_SERVICE_COLOR;
  if (max <= min) return [60, 220, 80];
  const t = Math.max(0, Math.min(1, (buses - min) / (max - min)));
  if (t < 0.5) {
    const k = t / 0.5;
    return [220, Math.round(60 + 180 * k), 50];
  }
  const k = (t - 0.5) / 0.5;
  return [Math.round(220 - 180 * k), 240, Math.round(50 + 30 * k)];
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
