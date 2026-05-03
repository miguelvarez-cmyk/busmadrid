/**
 * Clasifica una línea EMT en uno de tres grupos según su shortName:
 *   - 'night'   → empieza por N (nocturnas/búhos)
 *   - 'regular' → puramente numérica (1, 27, 150...)
 *   - 'special' → cualquier otra (C1, E1, S10, M1, T31...)
 */
export function classifyRoute(shortName) {
  if (/^N/i.test(shortName)) return 'night';
  if (/^\d+$/.test(shortName)) return 'regular';
  return 'special';
}

export const GROUP_LABELS = {
  regular: 'Diarias normales',
  special: 'Diarias especiales',
  night: 'Nocturnas',
};

export const GROUP_ORDER = ['regular', 'special', 'night'];

export function groupRoutes(routesMeta) {
  const groups = { regular: [], special: [], night: [] };
  for (const r of routesMeta) groups[classifyRoute(r.shortName)].push(r);

  const sortKey = (r) => {
    const m = r.shortName.match(/^([A-Za-z]*)(\d+)/);
    if (m) return [m[1].toUpperCase(), parseInt(m[2], 10), r.shortName];
    return ['ZZZ', 0, r.shortName];
  };
  for (const g of Object.values(groups)) {
    g.sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      for (let i = 0; i < ka.length; i++) {
        if (ka[i] < kb[i]) return -1;
        if (ka[i] > kb[i]) return 1;
      }
      return 0;
    });
  }
  return groups;
}
