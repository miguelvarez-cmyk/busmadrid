import { ScatterplotLayer } from '@deck.gl/layers';
import { colorAt } from '../utils/indicators.js';

// Paradas: más líneas / más expediciones = más servida → verde
const STOP_SCALE = { color: 'good-high' };
const STOP_DOMAIN = { routes: 8, expeditions: 60 };

export function stopValue(stop, mode, stopExpeditions) {
  if (mode === 'routes') return stop.properties.routes?.length ?? 0;
  if (mode === 'expeditions') return stopExpeditions?.byStop?.[stop.properties.stop_id]?.peak ?? 0;
  return null;
}

export function stopColor(value, mode) {
  const t = Math.min(1, Math.max(0, value / STOP_DOMAIN[mode]));
  return colorAt(STOP_SCALE, t);
}

export function createStopsLayer({ geojson, passing, onHover, stopColorMode, stopExpeditions, tone = 'dark' }) {
  if (!geojson) return null;

  // Solo paradas servidas por alguna línea que pasa el ámbito/filtros
  const data = geojson.features.filter((f) => f.properties.routes.some((r) => passing.has(r)));

  const getFillColor = (f) => {
    if (!stopColorMode) return tone === 'light' ? [40, 42, 48, 230] : [240, 240, 238, 230];
    return [...stopColor(stopValue(f, stopColorMode, stopExpeditions), stopColorMode), 235];
  };

  return new ScatterplotLayer({
    id: 'stops',
    data,
    getPosition: (f) => f.geometry.coordinates,
    getRadius: 14,
    radiusUnits: 'meters',
    radiusMinPixels: 2.5,
    radiusMaxPixels: 8,
    getFillColor,
    getLineColor: tone === 'light' ? [255, 255, 255, 255] : [20, 20, 22, 255],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    parameters: { depthTest: false },
    updateTriggers: { getFillColor: [stopColorMode, tone], getLineColor: [tone] },
    onHover: (info) => onHover?.(info.object ?? null),
  });
}
