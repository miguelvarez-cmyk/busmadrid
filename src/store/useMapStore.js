import { create } from 'zustand';
import { INITIAL_VIEW_STATE } from '../config/mapConfig.js';

export const useMapStore = create((set) => ({
  viewState: INITIAL_VIEW_STATE,
  setViewState: (viewState) => set({ viewState }),

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

  hoveredRouteId: null,
  setHoveredRouteId: (id) => set({ hoveredRouteId: id }),

  colorMode: 'route',
  setColorMode: (mode) => set({ colorMode: mode }),

  dayOfWeek: 0,
  startHour: 7,
  endHour: 10,
  setDayOfWeek: (d) => set({ dayOfWeek: d }),
  setHourRange: (startHour, endHour) => set({ startHour, endHour }),

  // Modo de selección por área (recuadro)
  boxSelectMode: false,
  setBoxSelectMode: (v) => set({ boxSelectMode: v }),
}));

export const useViewState = () => useMapStore((s) => s.viewState);
export const useSetViewState = () => useMapStore((s) => s.setViewState);
export const useSelectedRouteIds = () => useMapStore((s) => s.selectedRouteIds);
export const useHoveredRouteId = () => useMapStore((s) => s.hoveredRouteId);
export const useColorMode = () => useMapStore((s) => s.colorMode);
export const useTimeFilter = () =>
  useMapStore((s) => ({
    dayOfWeek: s.dayOfWeek,
    startHour: s.startHour,
    endHour: s.endHour,
  }));
export const useBoxSelectMode = () => useMapStore((s) => s.boxSelectMode);
