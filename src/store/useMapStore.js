import { create } from 'zustand';
import { INITIAL_VIEW_STATE, DEFAULT_BASEMAP } from '../config/mapConfig.js';

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

  colorMode: null,
  setColorMode: (mode) => set((state) => ({
    colorMode: state.colorMode === mode ? null : mode,
  })),

  dayOfWeek: 0,
  startHour: 7,
  endHour: 10,
  setDayOfWeek: (d) => set({ dayOfWeek: d }),
  setHourRange: (startHour, endHour) => set({ startHour, endHour }),

  // Filtros activos según el modo de coloreado
  freqFilter: [0, 60],     // minutos; freq fuera del rango oculta la línea
  speedFilter: null,       // [min, max] km/h; null hasta cargar route_speed
  demandFilter: null,      // [min, max] viajeros/día; null hasta cargar route_demand
  fleetFilter: null,       // [min, max] buses; null hasta cargar route_fleet
  tortuosityFilter: null,  // [min, max] ratio; null hasta cargar route_tortuosity
  scheduleFilter: null,    // [min, max] minutos; null hasta cargar route_schedule
  setFreqFilter: (range) => set({ freqFilter: range }),
  setSpeedFilter: (range) => set({ speedFilter: range }),
  setDemandFilter: (range) => set({ demandFilter: range }),
  setFleetFilter: (range) => set({ fleetFilter: range }),
  setTortuosityFilter: (range) => set({ tortuosityFilter: range }),
  setScheduleFilter: (range) => set({ scheduleFilter: range }),

  // Tipo de día para el modo Flota: LA=laborable, SA=sábado, FE=festivo
  fleetDayType: 'LA',
  setFleetDayType: (t) => set({ fleetDayType: t }),

  // Tipo de día para el modo Horario
  scheduleDayType: 'LA',
  setScheduleDayType: (t) => set({ scheduleDayType: t }),

  // Filtro de paradas por número de líneas: [min, max]
  stopRoutesFilter: null,
  setStopRoutesFilter: (range) => set({ stopRoutesFilter: range }),

  // Modo de color para paradas: 'routes' | 'expeditions' | null
  stopColorMode: null,
  setStopColorMode: (mode) => set((state) => ({
    stopColorMode: state.stopColorMode === mode ? null : mode,
  })),

  // Filtro de paradas por número de expediciones en hora punta: [min, max]
  stopExpeditionsFilter: null,
  setStopExpeditionsFilter: (range) => set({ stopExpeditionsFilter: range }),

  // Filtro de ocupación media de rutas: [min, max]
  occupancyFilter: null,
  setOccupancyFilter: (range) => set({ occupancyFilter: range }),

  // Modo de selección por área (recuadro)
  boxSelectMode: false,
  setBoxSelectMode: (v) => set({ boxSelectMode: v }),

  showStops: false,
  setShowStops: (v) => set({ showStops: v }),

  basemap: DEFAULT_BASEMAP,
  setBasemap: (id) => set({ basemap: id }),

  hoveredStop: null,
  setHoveredStop: (s) => set({ hoveredStop: s }),

  highlightedZoneIds: new Set(),
  toggleZoneHighlight: (barrioIds) =>
    set((state) => {
      const next = new Set(state.highlightedZoneIds);
      const allIn = barrioIds.every((id) => next.has(id));
      if (allIn) barrioIds.forEach((id) => next.delete(id));
      else barrioIds.forEach((id) => next.add(id));
      return { highlightedZoneIds: next };
    }),
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
export const useFreqFilter = () => useMapStore((s) => s.freqFilter);
export const useSpeedFilter = () => useMapStore((s) => s.speedFilter);
export const useDemandFilter = () => useMapStore((s) => s.demandFilter);
export const useFleetFilter = () => useMapStore((s) => s.fleetFilter);
export const useFleetDayType = () => useMapStore((s) => s.fleetDayType);
export const useTortuosityFilter = () => useMapStore((s) => s.tortuosityFilter);
export const useScheduleFilter = () => useMapStore((s) => s.scheduleFilter);
export const useScheduleDayType = () => useMapStore((s) => s.scheduleDayType);
export const useStopRoutesFilter = () => useMapStore((s) => s.stopRoutesFilter);
export const useStopColorMode = () => useMapStore((s) => s.stopColorMode);
export const useStopExpeditionsFilter = () => useMapStore((s) => s.stopExpeditionsFilter);
export const useOccupancyFilter = () => useMapStore((s) => s.occupancyFilter);
export const useBoxSelectMode = () => useMapStore((s) => s.boxSelectMode);
export const useShowStops = () => useMapStore((s) => s.showStops);
export const useHoveredStop = () => useMapStore((s) => s.hoveredStop);
export const useBasemap = () => useMapStore((s) => s.basemap);
export const useHighlightedZoneIds = () => useMapStore((s) => s.highlightedZoneIds);
