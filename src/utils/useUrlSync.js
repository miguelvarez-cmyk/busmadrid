import { useEffect, useRef } from 'react';
import {
  useMapStore,
  useViewState,
  useColorMode,
  useTimeFilter,
  useSelectedRouteIds,
  useBasemap,
  useShowStops,
  useStopColorMode,
} from '../store/useMapStore.js';

export function useUrlSync() {
  const initDoneRef = useRef(false);
  const timerRef = useRef(null);

  // On mount: read URL params → initialize store
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const {
      setViewState, setColorMode, setDayOfWeek, setHourRange,
      setSelectedRouteIds, setBasemap, setShowStops, setStopColorMode,
    } = useMapStore.getState();

    if (p.has('lon') && p.has('lat') && p.has('z')) {
      setViewState({ longitude: +p.get('lon'), latitude: +p.get('lat'), zoom: +p.get('z'), pitch: 0, bearing: 0 });
    }
    if (p.has('cm'))  setColorMode(p.get('cm'));
    if (p.has('dow')) setDayOfWeek(+p.get('dow'));
    if (p.has('sh') && p.has('eh')) setHourRange(+p.get('sh'), +p.get('eh'));
    if (p.has('r'))   setSelectedRouteIds(p.get('r').split(',').filter(Boolean));
    if (p.has('bm'))  setBasemap(p.get('bm'));
    if (p.has('ss'))  setShowStops(p.get('ss') === '1');
    if (p.has('scm')) setStopColorMode(p.get('scm'));

    initDoneRef.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const viewState       = useViewState();
  const colorMode       = useColorMode();
  const { dayOfWeek, startHour, endHour } = useTimeFilter();
  const selectedRouteIds = useSelectedRouteIds();
  const basemap         = useBasemap();
  const showStops       = useShowStops();
  const stopColorMode   = useStopColorMode();

  // State changes → write URL (debounced, no history pollution)
  useEffect(() => {
    if (!initDoneRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('lon', viewState.longitude.toFixed(5));
      p.set('lat', viewState.latitude.toFixed(5));
      p.set('z',   viewState.zoom.toFixed(2));
      if (colorMode)    p.set('cm', colorMode);
      p.set('dow', dayOfWeek);
      p.set('sh', startHour);
      p.set('eh', endHour);
      if (selectedRouteIds.size) p.set('r', [...selectedRouteIds].join(','));
      p.set('bm', basemap);
      if (showStops)    p.set('ss', '1');
      if (stopColorMode) p.set('scm', stopColorMode);
      window.history.replaceState(null, '', '?' + p.toString());
    }, 300);
  }, [viewState, colorMode, dayOfWeek, startHour, endHour, selectedRouteIds, basemap, showStops, stopColorMode]);
}
