import { useEffect, useRef, useState } from 'react';
import { geojson as fgbGeojson } from 'flatgeobuf';

const FGB_URL = '/data/edificios_poblacion.fgb';

// Solo carga cuando el zoom es suficiente para que los edificios sean visibles
const MIN_ZOOM = 14;

function viewportToRect(viewState) {
  const { longitude, latitude, zoom } = viewState;
  // Aproximación del bounding box visible según zoom
  const span = 360 / Math.pow(2, zoom);
  return {
    minX: longitude - span,
    minY: latitude - span * 0.6,
    maxX: longitude + span,
    maxY: latitude + span * 0.6,
  };
}

export function useBuildingsData(viewState, enabled) {
  const [features, setFeatures] = useState([]);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled || viewState.zoom < MIN_ZOOM) {
      setFeatures([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const rect = viewportToRect(viewState);
      const collected = [];
      try {
        const iter = fgbGeojson.iterate(FGB_URL, rect, { signal: controller.signal });
        for await (const feature of iter) {
          collected.push(feature);
        }
        if (!controller.signal.aborted) {
          setFeatures(collected);
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('useBuildingsData:', e);
      }
    }, 400);

    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [enabled, Math.round(viewState.zoom * 2), Math.round(viewState.longitude * 1000), Math.round(viewState.latitude * 1000)]);

  return features;
}
