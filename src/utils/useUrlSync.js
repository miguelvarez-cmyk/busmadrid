import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/useMapStore.js';
import { INDICATOR_BY_ID, DAY_TYPE_BY_ID } from './indicators.js';

// Enlaces de la versión anterior (?cm=offer&dow=0&sh=7&eh=10)
const LEGACY_MODES = {
  offer: 'interval', schedule: 'span', speed: 'speed', load: 'load', occupancy: 'load',
  demand: 'demand', fleet: 'fleet', tortuosity: 'tortuosity', divergence: 'divergence',
  length: 'length', coverage: 'coverage',
};
const LEGACY_DOW = { 5: 'SA', 6: 'FE' };

function parseFilters(s) {
  const out = {};
  for (const part of s.split(',')) {
    const [id, range] = part.split(':');
    if (!INDICATOR_BY_ID[id] || range == null) continue;
    const [lo, hi] = range.split('_').map((x) => (x === '' || x == null ? null : Number(x)));
    if (lo != null || hi != null) out[id] = [lo, hi];
  }
  return out;
}

function serializeFilters(filters) {
  return Object.entries(filters)
    .map(([id, [lo, hi]]) => `${id}:${lo ?? ''}_${hi ?? ''}`)
    .join(',');
}

const SNAPSHOT_KEYS = [
  'viewState', 'indicator', 'dayType', 'startHour', 'endHour', 'year', 'radius', 'filters',
  'selectedRouteIds', 'clickedRouteId', 'pinnedRouteIds', 'fichaOpen', 'tableColumns', 'sort',
  'panelWide', 'showStops', 'stopColorMode', 'totalRouteCount',
];

export function useUrlSync() {
  const timerRef = useRef(null);

  // Al montar: URL → store
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const patch = {};

    if (p.has('lon') && p.has('lat') && p.has('z')) {
      patch.viewState = { longitude: +p.get('lon'), latitude: +p.get('lat'), zoom: +p.get('z'), pitch: 0, bearing: 0 };
    }
    const ind = p.get('ind') ?? LEGACY_MODES[p.get('cm')];
    if (ind && INDICATOR_BY_ID[ind]) patch.indicator = ind;
    const d = p.get('d') ?? (p.has('dow') ? LEGACY_DOW[p.get('dow')] ?? 'LA' : null);
    if (d && DAY_TYPE_BY_ID[d]) patch.dayType = d;
    const h = p.get('h');
    if (h) {
      const [a, b] = h.split('-').map(Number);
      if (a >= 0 && b <= 24 && a < b) Object.assign(patch, { startHour: a, endHour: b });
    } else if (p.has('sh') && p.has('eh')) {
      Object.assign(patch, { startHour: +p.get('sh'), endHour: +p.get('eh') });
    }
    if (p.has('y')) patch.year = p.get('y');
    if (p.has('rad')) patch.radius = +p.get('rad');
    if (p.has('f')) patch.filters = parseFilters(p.get('f'));
    if (p.has('r')) patch.selectedRouteIds = new Set(p.get('r').split(',').filter(Boolean));
    if (p.has('l')) patch.clickedRouteId = p.get('l');
    if (p.has('p')) patch.pinnedRouteIds = p.get('p').split(',').filter(Boolean);
    patch.fichaOpen = p.get('fo') === '1' && Boolean(patch.clickedRouteId || patch.pinnedRouteIds?.length);
    if (p.has('cols')) {
      const cols = p.get('cols').split(',').filter((c) => INDICATOR_BY_ID[c]);
      patch.tableColumns = cols;
    }
    if (p.has('s')) {
      const [key, dir] = p.get('s').split(':');
      if (key === 'line' || INDICATOR_BY_ID[key]) patch.sort = { key, dir: dir === 'desc' ? 'desc' : 'asc' };
    }
    if (p.get('w') === '1') patch.panelWide = true;
    if (p.get('st') === '1') patch.showStops = true;
    if (p.has('stc')) patch.stopColorMode = p.get('stc');

    useMapStore.setState(patch);
  }, []);

  // Store → URL (con debounce y sin ensuciar el historial)
  useEffect(() => {
    let prev = null;
    const unsub = useMapStore.subscribe((state) => {
      const changed = !prev || SNAPSHOT_KEYS.some((k) => state[k] !== prev[k]);
      prev = state;
      if (!changed) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => writeUrl(useMapStore.getState()), 300);
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, []);
}

function writeUrl(s) {
  const p = new URLSearchParams();
  p.set('lon', s.viewState.longitude.toFixed(5));
  p.set('lat', s.viewState.latitude.toFixed(5));
  p.set('z', s.viewState.zoom.toFixed(2));
  if (s.indicator) p.set('ind', s.indicator);
  p.set('d', s.dayType);
  p.set('h', `${s.startHour}-${s.endHour}`);
  p.set('y', s.year);
  if (s.radius !== 300) p.set('rad', s.radius);
  const f = serializeFilters(s.filters);
  if (f) p.set('f', f);
  // Todas las líneas → sin parámetro (es el estado por defecto al cargar).
  // Ninguna → 'none', que no coincide con ningún route_id.
  // Mientras no han cargado las líneas (total 0) se conserva el 'r' original.
  const prevR = new URLSearchParams(window.location.search).get('r');
  if (s.totalRouteCount === 0) { if (prevR) p.set('r', prevR); }
  else if (s.selectedRouteIds.size === 0) p.set('r', 'none');
  else if (s.selectedRouteIds.size !== s.totalRouteCount) p.set('r', [...s.selectedRouteIds].join(','));
  if (s.clickedRouteId) p.set('l', s.clickedRouteId);
  if (s.pinnedRouteIds.length) p.set('p', s.pinnedRouteIds.join(','));
  if (s.fichaOpen) p.set('fo', '1');
  p.set('cols', s.tableColumns.join(','));
  if (s.sort.key !== 'line' || s.sort.dir !== 'asc') p.set('s', `${s.sort.key}:${s.sort.dir}`);
  if (s.panelWide) p.set('w', '1');
  if (s.showStops) p.set('st', '1');
  if (s.stopColorMode) p.set('stc', s.stopColorMode);
  window.history.replaceState(null, '', '?' + p.toString() + window.location.hash);
}
