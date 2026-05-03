import { useEffect, useState } from 'react';

export function useGTFSData() {
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [routesMeta, setRoutesMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/data/routes.geojson').then((r) => r.json()),
      fetch('/data/routes_meta.json').then((r) => r.json()),
    ])
      .then(([geo, meta]) => {
        if (cancelled) return;
        setRoutesGeojson(geo);
        setRoutesMeta(meta);
      })
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  return { routesGeojson, routesMeta, error, loading: !routesGeojson && !error };
}
