/**
 * Devuelve expediciones/hora para una línea en el rango [startHour, endHour)
 * de un día de la semana (0=lun … 6=dom). endHour exclusivo; si endHour <= startHour
 * el rango se considera vacío.
 *
 * Si la línea no tiene datos para ese día (no opera), devuelve 0.
 */
export function tripsPerHour(metrics, routeId, dow, startHour, endHour) {
  if (!metrics || endHour <= startHour) return 0;
  const row = metrics.byRoute?.[routeId]?.[String(dow)];
  if (!row) return 0;
  let total = 0;
  for (let h = startHour; h < endHour; h++) total += row[h] || 0;
  return total / (endHour - startHour);
}

/**
 * Calcula el rango [min, max] de expediciones/hora en el set seleccionado,
 * para usarlo como escala de color dinámica.
 */
export function computeOfferRange(metrics, routeIds, dow, startHour, endHour) {
  let min = Infinity;
  let max = 0;
  for (const id of routeIds) {
    const v = tripsPerHour(metrics, id, dow, startHour, endHour);
    if (v > 0 && v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min)) min = 0;
  return { min, max };
}

/**
 * Interpola un color rojo→amarillo→verde en función de t en [0, 1].
 * t=0 rojo, t=0.5 amarillo, t=1 verde. Devuelve [r,g,b].
 */
export function offerColor(t) {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.5) {
    const k = x / 0.5;
    return [220, Math.round(60 + 180 * k), 50];
  }
  const k = (x - 0.5) / 0.5;
  return [Math.round(220 - 180 * k), 240, Math.round(50 + 30 * k)];
}

/**
 * Color para una línea según su oferta y el rango actual. Si no opera (0), gris.
 */
export function offerColorForRoute(metrics, routeId, dow, startHour, endHour, range) {
  const v = tripsPerHour(metrics, routeId, dow, startHour, endHour);
  if (v === 0) return [120, 120, 120];
  const { min, max } = range;
  if (max <= min) return [60, 220, 80];
  const t = (v - min) / (max - min);
  return offerColor(t);
}
