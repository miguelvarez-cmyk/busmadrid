const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
};

// Dark Matter (CARTO): mapa base en grises oscuros con el viario muy legible
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const BASEMAPS = {
  osm: { id: 'osm', label: 'OSM', style: OSM_STYLE },
  dark: { id: 'dark', label: 'Gris oscuro', style: DARK_STYLE },
  satellite: { id: 'satellite', label: 'Satélite', style: SATELLITE_STYLE },
};

export const BASEMAP_ORDER = ['osm', 'dark', 'satellite'];
export const DEFAULT_BASEMAP = 'osm';

export const INITIAL_VIEW_STATE = {
  longitude: -3.7038,
  latitude: 40.4168,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};
