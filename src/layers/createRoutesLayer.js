import { GeoJsonLayer } from '@deck.gl/layers';

const DIMMED = [125, 128, 135, 40];

/**
 * Líneas EMT. Las que no pasan el ámbito/filtros se dibujan atenuadas en gris
 * y debajo; las destacadas (ficha abierta o fijadas) encima y más gruesas.
 *
 * colorOf(routeId) → [r,g,b] para las líneas que pasan.
 * colorKey: cualquier valor que cambie cuando cambian los colores.
 */
export function createRoutesLayer({ features, passing, colorOf, colorKey, hoveredIds, focusIds }) {
  if (!features) return null;
  const hovered = new Set(hoveredIds);
  const hasFocus = focusIds.size > 0;
  const hasHover = hovered.size > 0;

  const getLineColor = (f) => {
    const id = f.properties.route_id;
    if (!passing.has(id)) return DIMMED;
    const c = colorOf(id);
    if (focusIds.has(id) || hovered.has(id)) return [...c, 255];
    if (hasFocus || hasHover) return [...c, 70];
    return [...c, 210];
  };
  const getLineWidth = (f) => {
    const id = f.properties.route_id;
    if (!passing.has(id)) return 1;
    if (focusIds.has(id)) return 4.5;
    if (hovered.has(id)) return 4;
    return 2;
  };

  return new GeoJsonLayer({
    id: 'routes',
    data: features,
    lineWidthUnits: 'pixels',
    getLineWidth,
    getLineColor,
    pickable: true,
    parameters: { depthTest: false },
    updateTriggers: {
      getLineColor: [colorKey, passing, hoveredIds, focusIds],
      getLineWidth: [passing, hoveredIds, focusIds],
    },
  });
}

/** Ordena para dibujar: atenuadas → normales → destacadas. */
export function sortFeaturesForDraw(geojson, passing, focusIds) {
  if (!geojson) return null;
  const rank = (f) => {
    const id = f.properties.route_id;
    if (focusIds.has(id)) return 2;
    return passing.has(id) ? 1 : 0;
  };
  return [...geojson.features].sort((a, b) => rank(a) - rank(b));
}
