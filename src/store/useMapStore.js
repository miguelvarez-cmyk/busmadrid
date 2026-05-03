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
  selectAllRoutes: (ids) => set({ selectedRouteIds: new Set(ids) }),
  clearRoutes: () => set({ selectedRouteIds: new Set() }),
}));

export const useViewState = () => useMapStore((s) => s.viewState);
export const useSetViewState = () => useMapStore((s) => s.setViewState);
export const useSelectedRouteIds = () => useMapStore((s) => s.selectedRouteIds);
