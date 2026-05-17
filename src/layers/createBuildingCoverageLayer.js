import { GeoJsonLayer } from '@deck.gl/layers';

// Gradiente inverso al estándar: rojo(t=0, pocas líneas) → verde(t=1, muchas líneas)
// Gris para edificios sin ninguna línea cerca
export function buildingLineColor(nLineas, poblacion, maxLineas, maxPop) {
  const alpha = maxPop > 0
    ? Math.round(60 + 170 * Math.log1p(poblacion) / Math.log1p(maxPop))
    : 120;

  if (nLineas === 0) return [100, 100, 100, Math.max(30, alpha - 30)];

  const t = Math.min(nLineas / maxLineas, 1);
  let r, g;
  if (t < 0.5) {
    const k = t / 0.5;
    r = 220;
    g = Math.round(50 + 150 * k);
  } else {
    const k = (t - 0.5) / 0.5;
    r = Math.round(220 - 170 * k);
    g = 200;
  }
  return [r, g, 50, alpha];
}

export function createBuildingCoverageLayer({ geojson, onClickBuilding }) {
  if (!geojson) return null;

  const maxLineas = Math.max(1, ...geojson.features.map((f) => f.properties.n_lineas));
  const maxPop = Math.max(1, ...geojson.features.map((f) => f.properties.poblacion));

  return new GeoJsonLayer({
    id: 'building-coverage',
    data: geojson,
    filled: true,
    stroked: true,
    getFillColor: (f) =>
      buildingLineColor(f.properties.n_lineas, f.properties.poblacion, maxLineas, maxPop),
    getLineColor: [20, 20, 20, 80],
    lineWidthMinPixels: 0.4,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 60],
    onClick: (info) => onClickBuilding(info.object ?? null),
    updateTriggers: {
      getFillColor: [maxLineas, maxPop],
    },
  });
}
