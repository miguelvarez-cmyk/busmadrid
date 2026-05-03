import { useEffect, useState } from 'react';

export function useGTFSData() {
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [routesMeta, setRoutesMeta] = useState(null);
  const [serviceMetrics, setServiceMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/data/routes.geojson').then((r) => r.json()),
      fetch('/data/routes_meta.json').then((r) => r.json()),
      fetch('/data/service_metrics.json').then((r) => r.json()),
    ])
      .then(([geo, meta, metrics]) => {
        if (cancelled) return;
        setRoutesGeojson(geo);
        setRoutesMeta(meta);
        setServiceMetrics(metrics);
      })
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    routesGeojson,
    routesMeta,
    serviceMetrics,
    error,
    loading: !routesGeojson && !error,
  };
}
