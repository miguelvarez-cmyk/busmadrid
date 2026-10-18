import { useEffect, useState } from 'react';

// [clave, fichero, obligatorio]
const FILES = [
  ['routesGeojson', 'routes.geojson', true],
  ['routesMeta', 'routes_meta.json', true],
  ['serviceMetrics', 'service_metrics.json', true],
  ['stopsGeojson', 'stops.geojson', true],
  ['routeSpeed', 'route_speed.json', true],
  ['routeDemand', 'route_demand.json', true],
  ['routeFleet', 'route_fleet.json', true],
  ['routeTortuosity', 'route_tortuosity.json', true],
  ['routeDivergence', 'route_divergence.json', false],
  ['routeSchedule', 'route_schedule.json', false],
  ['stopExpeditions', 'stop_expeditions.json', false],
  ['routeCoverage', 'route_coverage.json', false],
  ['routeDepartureTimes', 'route_departure_times.json', false],
  ['routeLoadHourly', 'route_load_hourly.json', false],
];

export function useGTFSData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    Promise.all(
      FILES.map(([, file, required]) => {
        let p = fetch(`/data/${file}`).then((r) => r.json());
        if (!required) p = p.catch(() => null);
        return p.then((v) => {
          loaded += 1;
          if (!cancelled) setProgress(Math.round((loaded / FILES.length) * 100));
          return v;
        });
      })
    )
      .then((results) => {
        if (cancelled) return;
        setData(Object.fromEntries(FILES.map(([key], i) => [key, results[i]])));
      })
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading: !data && !error, progress };
}
