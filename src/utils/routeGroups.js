/**
 * Clasificación de líneas EMT siguiendo la taxonomía de la Wikipedia
 * (es.wikipedia.org/wiki/Anexo:Líneas_de_la_EMT_Madrid).
 *
 * Categorías presentes en el feed actual:
 *   regular     — numéricas (excepto 001/002) + circulares C03/C1/C2
 *   express     — E, E1–E5
 *   university  — U, A, F, G, H (Ciudad Universitaria)
 *   special     — SE*, T*, M*, H1, BR1, 001, 002
 *   metro       — S*, SC* (sustitutivas de metro)
 *   night       — N*, NC* (búhos)
 *
 * El orden de los regex importa: casos específicos (H1, 001, 002) deben
 * comprobarse antes que sus generalizaciones (H, dígito).
 */
export function classifyRoute(shortName) {
  const s = (shortName || '').toUpperCase();
  if (/^NC/.test(s)) return 'night';
  if (/^N\d/.test(s) || s === 'N') return 'night';
  if (/^SC/.test(s)) return 'metro';
  if (/^SE/.test(s)) return 'special';
  if (/^S\d/.test(s)) return 'metro';
  if (/^M\d/.test(s)) return 'special';
  if (/^C\d/.test(s)) return 'regular';
  if (/^E\d?$/.test(s) || /^E\d/.test(s)) return 'express';
  if (/^U/.test(s)) return 'university';
  if (/^[AFG]$/.test(s)) return 'university';
  if (s === 'H1') return 'special';
  if (/^H/.test(s)) return 'university';
  if (/^T\d/.test(s)) return 'special';
  if (/^BR/.test(s)) return 'special';
  if (s === '001' || s === '002') return 'special';
  if (/^\d/.test(s)) return 'regular';
  return 'special';
}

export const GROUP_LABELS = {
  regular:    'Diurnas regulares',
  express:    'Exprés (E)',
  university: 'Universitarias (U, A, F, G, H)',
  special:    'Servicios especiales (SE, T, M, H1, BR, 001, 002)',
  metro:      'Sustitutivas metro (S, SC)',
  night:      'Nocturnas (N, NC)',
};

export const GROUP_ORDER = [
  'regular',
  'express',
  'university',
  'special',
  'metro',
  'night',
];

export function groupRoutes(routesMeta) {
  const groups = Object.fromEntries(GROUP_ORDER.map((k) => [k, []]));
  for (const r of routesMeta) groups[classifyRoute(r.shortName)].push(r);

  const sortKey = (r) => {
    const m = r.shortName.match(/^([A-Za-z]*)(\d+)?/);
    const prefix = (m && m[1] ? m[1] : '').toUpperCase();
    const num = m && m[2] ? parseInt(m[2], 10) : 0;
    return [prefix, num, r.shortName];
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
