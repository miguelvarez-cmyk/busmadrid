const raster = (id, tiles, attribution) => ({
  version: 8,
  sources: { [id]: { type: 'raster', tiles, tileSize: 256, attribution, maxzoom: 19 } },
  layers: [{ id, type: 'raster', source: id }],
});

// tone: luminosidad del fondo, para elegir colores de línea legibles encima
export const BASEMAPS = {
  dark: { label: 'Oscuro', tone: 'dark', style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  light: { label: 'Gris claro', tone: 'light', style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  osm: {
    label: 'OpenStreetMap',
    tone: 'light',
    style: raster('osm', ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], '© OpenStreetMap contributors'),
  },
  satellite: {
    label: 'Satélite',
    tone: 'dark',
    style: raster(
      'satellite',
      ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      'Tiles © Esri — Esri, Maxar, Earthstar Geographics'
    ),
  },
};
export const BASEMAP_ORDER = ['dark', 'light', 'osm', 'satellite'];
// Fondo que acompaña a cada tema de la interfaz
export const THEME_BASEMAP = { dark: 'dark', light: 'light' };

export const INITIAL_VIEW_STATE = {
  longitude: -3.7038,
  latitude: 40.4168,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};
