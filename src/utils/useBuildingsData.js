import { useEffect, useRef, useState } from 'react';
import { geojson } from 'flatgeobuf';

const FGB_URL = '/data/edificios_poblacion.fgb';
const MIN_ZOOM = 13;

function viewportRect(viewState) {
  const { longitude, latitude, zoom } = viewState;
  const span = 360 / Math.pow(2, zoom);
  return {
    minX: longitude - span,
    minY: latitude - span * 0.7,
    maxX: longitude + span,
    maxY: latitude + span * 0.7,
  };
}

export function useBuildingsData(viewState, enabled) {
  const [features, setFeatures] = useState([]);
  const debounceRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled || viewState.zoom < MIN_ZOOM) {
      setFeatures([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      cancelledRef.current = false;
      const rect = viewportRect(viewState);
      const collected = [];
      try {
        console.log('[buildings] cargando rect:', rect, 'zoom:', viewState.zoom);
        // geojson.deserialize(url, rect, ...) internamente usa HTTP range requests
        // cuando el primer arg es un string URL y hay un rect bbox
        for await (const feature of geojson.deserialize(FGB_URL, rect)) {
          if (cancelledRef.current) return;
          collected.push(feature);
        }
        console.log('[buildings] cargados:', collected.length);
        if (!cancelledRef.current) setFeatures(collected);
      } catch (e) {
        console.error('[buildings] error:', e);
      }
    }, 400);

    return () => {
      clearTimeout(debounceRef.current);
      cancelledRef.current = true;
    };
  }, [
    enabled,
    Math.round(viewState.zoom * 2),
    Math.round(viewState.longitude * 1000),
    Math.round(viewState.latitude * 1000),
  ]);

  return features;
}
