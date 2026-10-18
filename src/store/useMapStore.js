import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { INITIAL_VIEW_STATE, BASEMAPS, THEME_BASEMAP } from '../config/mapConfig.js';

// El tema es una preferencia del visitante: se guarda en el navegador
function storedTheme() {
  try {
    return localStorage.getItem('busmadrid-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
const INITIAL_THEME = storedTheme();

export const DEFAULT_COLUMNS = ['demand', 'interval', 'load', 'speed'];
export const MAX_PINNED = 6;

export const useMapStore = create((set) => ({
  viewState: INITIAL_VIEW_STATE,
  setViewState: (viewState) => set({ viewState }),

  // Ámbito: líneas incluidas (filtro "Líneas")
  selectedRouteIds: new Set(),
  setSelectedRouteIds: (ids) => set({ selectedRouteIds: new Set(ids) }),
  toggleRoute: (id) =>
    set((state) => {
      const next = new Set(state.selectedRouteIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedRouteIds: next };
    }),
  setRangeSelection: (ids, value) =>
    set((state) => {
      const next = new Set(state.selectedRouteIds);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      return { selectedRouteIds: next };
    }),
  selectAllRoutes: (ids) => set({ selectedRouteIds: new Set(ids) }),
  clearRoutes: () => set({ selectedRouteIds: new Set() }),
  // Nº total de líneas del feed (para no escribir todas en la URL)
  totalRouteCount: 0,
  setTotalRouteCount: (n) => set({ totalRouteCount: n }),

  // Indicador que colorea el mapa (null = red neutra)
  indicator: null,
  setIndicator: (indicator) => set({ indicator }),

  // Contexto temporal global
  dayType: 'LA',
  startHour: 7,
  endHour: 9,
  year: '2025',
  radius: 300,
  setDayType: (dayType) => set({ dayType }),
  setHourRange: (startHour, endHour) => set({ startHour, endHour }),
  setYear: (year) => set({ year }),
  setRadius: (radius) => set({ radius }),

  // Filtros combinados: { [indicatorId]: [min|null, max|null] }
  filters: {},
  setFilter: (id, range) =>
    set((state) => {
      const next = { ...state.filters };
      if (!range || (range[0] == null && range[1] == null)) delete next[id];
      else next[id] = range;
      return { filters: next };
    }),
  clearFilters: () => set({ filters: {} }),

  hoveredRouteIds: [],
  setHoveredRouteIds: (ids) => set({ hoveredRouteIds: ids }),

  // Ficha: línea abierta + líneas fijadas para comparar
  clickedRouteId: null,
  setClickedRouteId: (id) => set(id ? { clickedRouteId: id, fichaOpen: true } : { clickedRouteId: null }),
  pinnedRouteIds: [],
  togglePin: (id) =>
    set((state) => {
      if (state.pinnedRouteIds.includes(id)) {
        return { pinnedRouteIds: state.pinnedRouteIds.filter((x) => x !== id) };
      }
      if (state.pinnedRouteIds.length >= MAX_PINNED) return {};
      return { pinnedRouteIds: [...state.pinnedRouteIds, id] };
    }),
  setPinnedRouteIds: (ids) => set({ pinnedRouteIds: ids.slice(0, MAX_PINNED) }),
  fichaOpen: false,
  openFicha: () => set({ fichaOpen: true }),
  closeFicha: () => set({ fichaOpen: false, clickedRouteId: null }),

  // Tabla
  tableColumns: DEFAULT_COLUMNS,
  setTableColumns: (cols) => set({ tableColumns: cols }),
  sort: { key: 'line', dir: 'asc' },
  setSort: (sort) => set({ sort }),
  panelWide: false,
  setPanelWide: (panelWide) => set({ panelWide }),

  // Tema de la interfaz y mapa base. Al cambiar de tema, el fondo lo
  // acompaña si estaba en el fondo por defecto del otro tema.
  theme: INITIAL_THEME,
  setTheme: (theme) =>
    set((state) => {
      try { localStorage.setItem('busmadrid-theme', theme); } catch { /* sin almacenamiento */ }
      const followBasemap = state.basemap === THEME_BASEMAP[state.theme];
      return { theme, basemap: followBasemap ? THEME_BASEMAP[theme] : state.basemap };
    }),
  basemap: THEME_BASEMAP[INITIAL_THEME],
  setBasemap: (basemap) => set(BASEMAPS[basemap] ? { basemap } : {}),

  // Guía de bienvenida
  tourOpen: false,
  setTourOpen: (tourOpen) => set({ tourOpen }),

  boxSelectMode: false,
  setBoxSelectMode: (v) => set({ boxSelectMode: v }),

  // Capa de paradas
  showStops: false,
  setShowStops: (v) => set({ showStops: v }),
  stopColorMode: null, // 'routes' | 'expeditions' | null
  setStopColorMode: (mode) => set({ stopColorMode: mode }),
  hoveredStop: null,
  setHoveredStop: (s) => set({ hoveredStop: s }),
}));

export const useViewState = () => useMapStore((s) => s.viewState);
export const useSetViewState = () => useMapStore((s) => s.setViewState);
export const useSelectedRouteIds = () => useMapStore((s) => s.selectedRouteIds);
export const useHoveredRouteIds = () => useMapStore((s) => s.hoveredRouteIds);
export const useClickedRouteId = () => useMapStore((s) => s.clickedRouteId);
export const usePinnedRouteIds = () => useMapStore((s) => s.pinnedRouteIds);
export const useFichaOpen = () => useMapStore((s) => s.fichaOpen);
export const useIndicator = () => useMapStore((s) => s.indicator);
export const useFilters = () => useMapStore((s) => s.filters);
// useShallow: misma referencia mientras no cambien los valores, para no
// invalidar memos/capas en cada actualización del store (p. ej. hover)
export const useCtx = () =>
  useMapStore(useShallow((s) => ({
    dayType: s.dayType,
    startHour: s.startHour,
    endHour: s.endHour,
    year: s.year,
    radius: s.radius,
  })));
export const useTableColumns = () => useMapStore((s) => s.tableColumns);
export const useSort = () => useMapStore((s) => s.sort);
export const usePanelWide = () => useMapStore((s) => s.panelWide);
export const useTheme = () => useMapStore((s) => s.theme);
export const useBasemap = () => useMapStore((s) => s.basemap);
export const useTourOpen = () => useMapStore((s) => s.tourOpen);
export const useBoxSelectMode = () => useMapStore((s) => s.boxSelectMode);
export const useShowStops = () => useMapStore((s) => s.showStops);
export const useStopColorMode = () => useMapStore((s) => s.stopColorMode);
export const useHoveredStop = () => useMapStore((s) => s.hoveredStop);
