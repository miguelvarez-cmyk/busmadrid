import { useEffect, useState } from 'react';
import { geojson } from 'flatgeobuf';

const FGB_URL = '/data/route_buffers.fgb';

/**
 * Loads all route buffer polygons once at startup.
 * Returns a Map: route_id → Map<distance_m (number) → geometry (GeoJSON)>
 * or null while loading.
 */
export function useRouteBuffers(enabled) {
  const [buffers, setBuffers] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      const index = new Map();
      try {
        for await (const feature of geojson.deserialize(FGB_URL)) {
          if (cancelled) return;
          const { route_id, distance_m } = feature.properties;
          if (!index.has(route_id)) index.set(route_id, new Map());
          index.get(route_id).set(Number(distance_m), feature.geometry);
        }
        if (!cancelled) setBuffers(index);
      } catch (e) {
        console.error('[routeBuffers] error:', e);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [enabled]);

  return buffers;
}
