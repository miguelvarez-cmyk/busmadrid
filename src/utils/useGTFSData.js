import { useEffect, useState } from 'react';

export function useGTFSData() {
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [routesMeta, setRoutesMeta] = useState(null);
  const [serviceMetrics, setServiceMetrics] = useState(null);
  const [stopsGeojson, setStopsGeojson] = useState(null);
  const [routeSpeed, setRouteSpeed] = useState(null);
  const [routeDemand, setRouteDemand] = useState(null);
  const [routeFleet, setRouteFleet] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/data/routes.geojson').then((r) => r.json()),
      fetch('/data/routes_meta.json').then((r) => r.json()),
      fetch('/data/service_metrics.json').then((r) => r.json()),
      fetch('/data/stops.geojson').then((r) => r.json()),
      fetch('/data/route_speed.json').then((r) => r.json()),
      fetch('/data/route_demand.json').then((r) => r.json()),
      fetch('/data/route_fleet.json').then((r) => r.json()),
    ])
      .then(([geo, meta, metrics, stops, speed, demand, fleet]) => {
        if (cancelled) return;
        setRoutesGeojson(geo);
        setRoutesMeta(meta);
        setServiceMetrics(metrics);
        setStopsGeojson(stops);
        setRouteSpeed(speed);
        setRouteDemand(demand);
        setRouteFleet(fleet);
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
    stopsGeojson,
    routeSpeed,
    routeDemand,
    routeFleet,
    error,
    loading: !routesGeojson && !error,
  };
}
