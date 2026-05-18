import { useEffect, useRef, useState } from 'react';
import { geojson } from 'flatgeobuf';
import { pointInAnyGeometry } from './pointInPolygon.js';

const FGB_URL = '/data/edificios_poblacion.fgb';
// Zoom 12 shows an entire bus line while keeping building count manageable
const MIN_ZOOM = 12;

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

function featureCentroid(feature) {
  const geom = feature.geometry;
  if (!geom) return null;
  let ring;
  if (geom.type === 'Polygon') ring = geom.coordinates[0];
  else if (geom.type === 'MultiPolygon') ring = geom.coordinates[0]?.[0];
  if (!ring?.length) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of ring) { sx += x; sy += y; }
  return [sx / ring.length, sy / ring.length];
}

function getActiveGeometries(routeBuffers, selectedRouteIds, coverageDistance) {
  if (!routeBuffers || !selectedRouteIds?.size) return null;
  const geoms = [];
  for (const routeId of selectedRouteIds) {
    const byDist = routeBuffers.get(routeId);
    if (!byDist) continue;
    const geom = byDist.get(coverageDistance);
    if (geom) geoms.push(geom);
  }
  return geoms.length ? geoms : null;
}

function applyFilter(raw, routeBuffers, selectedRouteIds, coverageDistance) {
  if (!routeBuffers) return [];
  const geoms = getActiveGeometries(routeBuffers, selectedRouteIds, coverageDistance);
  if (!geoms) return [];
  return raw.filter((f) => {
    const c = featureCentroid(f);
    return c && pointInAnyGeometry(c[0], c[1], geoms);
  });
}

export function useBuildingsData(viewState, enabled, routeBuffers, selectedRouteIds, coverageDistance) {
  const [features, setFeatures] = useState([]);
  const rawRef = useRef([]); // raw viewport buildings, unfiltered
  const debounceRef = useRef(null);
  const cancelledRef = useRef(false);
  const zoomRef = useRef(viewState.zoom);
  zoomRef.current = viewState.zoom;

  // Effect 1: reload from FGB when viewport or enabled changes
  useEffect(() => {
    if (!enabled || viewState.zoom < MIN_ZOOM) {
      rawRef.current = [];
      setFeatures([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      cancelledRef.current = false;
      const rect = viewportRect(viewState);
      const collected = [];
      try {
        for await (const feature of geojson.deserialize(FGB_URL, rect)) {
          if (cancelledRef.current) return;
          collected.push(feature);
        }
        if (!cancelledRef.current) {
          rawRef.current = collected;
          setFeatures(applyFilter(collected, routeBuffers, selectedRouteIds, coverageDistance));
        }
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
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: re-filter raw data when selection/distance changes (no network call)
  useEffect(() => {
    if (!enabled || zoomRef.current < MIN_ZOOM) return;
    setFeatures(applyFilter(rawRef.current, routeBuffers, selectedRouteIds, coverageDistance));
  }, [routeBuffers, selectedRouteIds, coverageDistance, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return features;
}
