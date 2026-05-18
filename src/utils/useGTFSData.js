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
  const [routeDivergence, setRouteDivergence] = useState(null);
  const [routeSchedule, setRouteSchedule] = useState(null);
  const [routeDistricts, setRouteDistricts] = useState(null);
  const [barriosGeojson, setBarriosGeojson] = useState(null);
  const [stopExpeditions, setStopExpeditions] = useState(null);
  const [routeCoverage, setRouteCoverage] = useState(null);
  const [metroCercaniasRoutes, setMetroCercaniasRoutes] = useState(null);
  const [metroCercaniasStops, setMetroCercaniasStops] = useState(null);
  const [busLanesGeojson, setBusLanesGeojson] = useState(null);
  const [parkingBandsGeojson, setParkingBandsGeojson] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    const total = 18;
    const track = (p) => p.then((v) => {
      loaded++;
      if (!cancelled) setProgress(Math.round((loaded / total) * 100));
      return v;
    });
    Promise.all([
      track(fetch('/data/routes.geojson').then((r) => r.json())),
      track(fetch('/data/routes_meta.json').then((r) => r.json())),
      track(fetch('/data/service_metrics.json').then((r) => r.json())),
      track(fetch('/data/stops.geojson').then((r) => r.json())),
      track(fetch('/data/route_speed.json').then((r) => r.json())),
      track(fetch('/data/route_demand.json').then((r) => r.json())),
      track(fetch('/data/route_fleet.json').then((r) => r.json())),
      track(fetch('/data/route_tortuosity.json').then((r) => r.json())),
      track(fetch('/data/route_divergence.json').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/route_schedule.json').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/route_districts.json').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/barrios.geojson').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/stop_expeditions.json').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/route_coverage.json').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/metro_cercanias_routes.geojson').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/metro_cercanias_stops.geojson').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/bus_lanes.geojson').then((r) => r.json()).catch(() => null)),
      track(fetch('/data/parking_bands.geojson').then((r) => r.json()).catch(() => null)),
    ])
      .then(([geo, meta, metrics, stops, speed, demand, fleet, tortuosity, divergence, schedule, districts, barrios, stopExp, coverage, mcRoutes, mcStops, busLanes, parkingBands]) => {
        if (cancelled) return;
        setRoutesGeojson(geo);
        setRoutesMeta(meta);
        setServiceMetrics(metrics);
        setStopsGeojson(stops);
        setRouteSpeed(speed);
        setRouteDemand(demand);
        setRouteFleet(fleet);
        setRouteTortuosity(tortuosity);
        setRouteDivergence(divergence);
        setRouteSchedule(schedule);
        setRouteDistricts(districts);
        setBarriosGeojson(barrios);
        setStopExpeditions(stopExp);
        setRouteCoverage(coverage);
        setMetroCercaniasRoutes(mcRoutes);
        setMetroCercaniasStops(mcStops);
        setBusLanesGeojson(busLanes);
        setParkingBandsGeojson(parkingBands);
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
    routeDivergence,
    routeSchedule,
    routeDistricts,
    barriosGeojson,
    stopExpeditions,
    routeCoverage,
    metroCercaniasRoutes,
    metroCercaniasStops,
    busLanesGeojson,
    parkingBandsGeojson,
    error,
    loading: !routesGeojson && !error,
    progress,
  };
}
