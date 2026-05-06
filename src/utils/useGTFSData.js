import { useEffect, useState } from 'react';

export function useGTFSData() {
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [routesMeta, setRoutesMeta] = useState(null);
  const [serviceMetrics, setServiceMetrics] = useState(null);
  const [stopsGeojson, setStopsGeojson] = useState(null);
  const [routeSpeed, setRouteSpeed] = useState(null);
  const [routeDemand, setRouteDemand] = useState(null);
  const [routeFleet, setRouteFleet] = useState(null);
  const [routeTortuosity, setRouteTortuosity] = useState(null);
  const [routeSchedule, setRouteSchedule] = useState(null);
  const [routeDistricts, setRouteDistricts] = useState(null);
  const [barriosGeojson, setBarriosGeojson] = useState(null);
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
      fetch('/data/route_tortuosity.json').then((r) => r.json()),
      fetch('/data/route_schedule.json').then((r) => r.json()).catch(() => null),
      fetch('/data/route_districts.json').then((r) => r.json()).catch(() => null),
      fetch('/data/barrios.geojson').then((r) => r.json()).catch(() => null),
    ])
      .then(([geo, meta, metrics, stops, speed, demand, fleet, tortuosity, schedule, districts, barrios]) => {
        if (cancelled) return;
        setRoutesGeojson(geo);
        setRoutesMeta(meta);
        setServiceMetrics(metrics);
        setStopsGeojson(stops);
        setRouteSpeed(speed);
        setRouteDemand(demand);
        setRouteFleet(fleet);
        setRouteTortuosity(tortuosity);
        setRouteSchedule(schedule);
        setRouteDistricts(districts);
        setBarriosGeojson(barrios);
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
    routeTortuosity,
    routeSchedule,
    routeDistricts,
    barriosGeojson,
    error,
    loading: !routesGeojson && !error,
  };
}
