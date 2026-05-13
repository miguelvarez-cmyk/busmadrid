import { useEffect, useMemo } from 'react';
import { useClickedRouteId, useMapStore, useSetViewState } from '../../store/useMapStore.js';
import { scheduleRangeFromMetrics, formatSpanMinutes } from '../../utils/service.js';

function getBbox(routesGeojson, routeId) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of routesGeojson?.features ?? []) {
    if (f.properties.route_id !== routeId) continue;
    const lines = f.geometry.type === 'MultiLineString'
      ? f.geometry.coordinates
      : [f.geometry.coordinates];
    for (const line of lines) {
      for (const [lon, lat] of line) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return minLon === Infinity ? null : { minLon, maxLon, minLat, maxLat };
}

function HourChart({ row0, row1, color }) {
  const hours = Array.from({ length: 24 }, (_, h) => (row0?.[h] ?? 0) + (row1?.[h] ?? 0));
  const maxV = Math.max(1, ...hours);
  return (
    <div className="rd-hour-chart">
      <div className="rd-hour-bars">
        {hours.map((v, h) => (
          <div
            key={h}
            className="rd-hour-bar"
            style={{ height: `${Math.max(2, Math.round((v / maxV) * 44))}px`, background: color, opacity: v > 0 ? 1 : 0.12 }}
            title={`${h}:00 — ${v} exp.`}
          />
        ))}
      </div>
      <div className="rd-hour-labels">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
}

export default function RouteDrawer({
  routesMeta,
  routeSpeed,
  routeDemand,
  routeFleet,
  routeSchedule,
  serviceMetrics,
  routesGeojson,
  dayOfWeek,
}) {
  const clickedRouteId = useClickedRouteId();
  const setClickedRouteId = useMapStore((s) => s.setClickedRouteId);
  const setViewState = useSetViewState();

  const isOpen = Boolean(clickedRouteId);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setClickedRouteId(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, setClickedRouteId]);

  const routeMeta   = useMemo(() => routesMeta?.find((r) => r.id === clickedRouteId), [clickedRouteId, routesMeta]);
  const speedData   = useMemo(() => routeSpeed?.byRoute?.[clickedRouteId], [clickedRouteId, routeSpeed]);
  const demandData  = useMemo(() => routeDemand?.byRoute?.[clickedRouteId], [clickedRouteId, routeDemand]);
  const fleetData   = useMemo(() => routeFleet?.byRoute?.[clickedRouteId], [clickedRouteId, routeFleet]);
  const scheduleData = useMemo(() => routeSchedule?.byRoute?.[clickedRouteId], [clickedRouteId, routeSchedule]);
  const scheduleRange = useMemo(() => scheduleRangeFromMetrics(serviceMetrics, clickedRouteId, dayOfWeek), [serviceMetrics, clickedRouteId, dayOfWeek]);

  const row0 = serviceMetrics?.byRoute?.[clickedRouteId]?.[String(dayOfWeek)]?.['0'];
  const row1 = serviceMetrics?.byRoute?.[clickedRouteId]?.[String(dayOfWeek)]?.['1'];

  const routeColor = routeMeta ? `#${routeMeta.color}` : '#888';

  function handleCenter() {
    const bbox = getBbox(routesGeojson, clickedRouteId);
    if (!bbox) return;
    const { minLon, maxLon, minLat, maxLat } = bbox;
    const span = Math.max(maxLon - minLon, maxLat - minLat);
    const zoom = Math.min(16, Math.max(10, Math.round(Math.log2(0.4 / span) + 11)));
    setViewState({
      longitude: (minLon + maxLon) / 2,
      latitude:  (minLat + maxLat) / 2,
      zoom,
      transitionDuration: 800,
    });
  }

  return (
    <div className={`route-drawer${isOpen ? ' open' : ''}`}>
      {routeMeta && (
        <>
          <div className="rd-header" style={{ borderLeft: `4px solid ${routeColor}` }}>
            <span className="rd-swatch" style={{ background: routeColor }} />
            <div className="rd-names">
              <b>Línea {routeMeta.shortName}</b>
              <span>{routeMeta.longName}</span>
            </div>
            <button className="rd-close" onClick={() => setClickedRouteId(null)} aria-label="Cerrar">×</button>
          </div>

          <div className="rd-body">
            <div className="rd-stats">
              {speedData && (
                <>
                  <div className="rd-stat">
                    <span className="rd-stat-label">Longitud</span>
                    <span className="rd-stat-value">{speedData.lengthKm.toFixed(1)} km</span>
                  </div>
                  <div className="rd-stat">
                    <span className="rd-stat-label">Duración</span>
                    <span className="rd-stat-value">{Math.round(speedData.durMin)} min</span>
                  </div>
                  <div className="rd-stat">
                    <span className="rd-stat-label">Velocidad</span>
                    <span className="rd-stat-value">{speedData.speedKmh.toFixed(1)} km/h</span>
                  </div>
                </>
              )}
              {demandData && (
                <div className="rd-stat">
                  <span className="rd-stat-label">Demanda diaria</span>
                  <span className="rd-stat-value">{Math.round(demandData.dailyAvg).toLocaleString('es-ES')} pax</span>
                </div>
              )}
              {fleetData && (
                <div className="rd-stat">
                  <span className="rd-stat-label">Flota (laborable)</span>
                  <span className="rd-stat-value">{fleetData.LA} buses</span>
                </div>
              )}
              {scheduleRange && (
                <div className="rd-stat">
                  <span className="rd-stat-label">Horario</span>
                  <span className="rd-stat-value">{scheduleRange}</span>
                </div>
              )}
              {scheduleData?.LA != null && (
                <div className="rd-stat">
                  <span className="rd-stat-label">Amplitud (lab.)</span>
                  <span className="rd-stat-value">{formatSpanMinutes(scheduleData.LA)}</span>
                </div>
              )}
            </div>

            {(row0 || row1) && (
              <div className="rd-section">
                <div className="rd-section-title">Expediciones por hora</div>
                <HourChart row0={row0} row1={row1} color={routeColor} />
              </div>
            )}

            <button className="rd-center-btn" onClick={handleCenter}>
              Centrar en mapa
            </button>
          </div>
        </>
      )}
    </div>
  );
}
