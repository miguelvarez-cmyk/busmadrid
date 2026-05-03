import { create } from 'zustand';
import { INITIAL_VIEW_STATE } from '../config/mapConfig.js';

export const useMapStore = create((set) => ({
  viewState: INITIAL_VIEW_STATE,
  setViewState: (viewState) => set({ viewState }),

  visibleLayers: { stops: true, routes: true, vehicles: false },
  toggleLayer: (key) =>
    set((state) => ({
      visibleLayers: { ...state.visibleLayers, [key]: !state.visibleLayers[key] },
    })),

  selectedRouteId: null,
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),
}));

export const useViewState = () => useMapStore((s) => s.viewState);
export const useSetViewState = () => useMapStore((s) => s.setViewState);
