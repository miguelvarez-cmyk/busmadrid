import { useEffect, useMemo } from 'react';
import { useClickedRouteId, useMapStore, useSetViewState } from '../../store/useMapStore.js';
import { scheduleTableFromMetrics } from '../../utils/service.js';

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
      <div className="rd-hour-chart-inner">
        <div className="rd-hour-yaxis">
          <span>{maxV}</span>
          <span>0</span>
        </div>
        <div className="rd-hour-bars">
          {hours.map((v, h) => (
            <div
              key={h}
              className="rd-hour-bar"
              style={{ height: `${Math.max(2, Math.round((v / maxV) * 72))}px`, background: color, opacity: v > 0 ? 1 : 0.12 }}
              title={`${h}:00 h — ${v} expedición${v !== 1 ? 'es' : ''}`}
              role="img"
              aria-label={`${h}:00 h: ${v} expedicion${v !== 1 ? 'es' : ''}`}
            />
          ))}
        </div>
      </div>
      <div className="rd-hour-labels">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
}

function formatPax(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1_000)}k`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(Math.round(v));
}

export default function RouteDrawer({
  routesMeta,
  routeSpeed,
  routeDemand,
  demandYear,
  routeCoverage,
  serviceMetrics,
  routesGeojson,
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
  const demandAvg = useMemo(() => {
    if (!routeDemand || !clickedRouteId) return null;
    const entry = routeDemand.byRoute?.[clickedRouteId];
    if (!entry) return null;
    const y = demandYear ?? routeDemand.year ?? '2025';
    return entry.byYear?.[y]?.dailyAvg ?? entry.dailyAvg ?? null;
  }, [clickedRouteId, routeDemand, demandYear]);
  const coverage300 = useMemo(() => routeCoverage?.byRoute?.[clickedRouteId]?.['300'] ?? null, [clickedRouteId, routeCoverage]);
  const scheduleTable = useMemo(() => scheduleTableFromMetrics(serviceMetrics, clickedRouteId), [serviceMetrics, clickedRouteId]);
  const stopsCount  = routeMeta?.stopsCount ?? null;

  const metricsForRoute = serviceMetrics?.byRoute?.[clickedRouteId];
  const la0 = metricsForRoute?.['0']?.['0'];
  const la1 = metricsForRoute?.['0']?.['1'];
  const sa0 = metricsForRoute?.['5']?.['0'];
  const sa1 = metricsForRoute?.['5']?.['1'];
  const fe0 = metricsForRoute?.['6']?.['0'];
  const fe1 = metricsForRoute?.['6']?.['1'];

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
      pitch: 0,
      bearing: 0,
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
              {demandAvg != null && (
                <div className="rd-stat">
                  <span className="rd-stat-label">Demanda diaria {demandYear}</span>
                  <span className="rd-stat-value">{Math.round(demandAvg).toLocaleString('es-ES')} pax</span>
                </div>
              )}
              {stopsCount && (
                <>
                  <div className="rd-stat">
                    <span className="rd-stat-label">Paradas (ida)</span>
                    <span className="rd-stat-value">{stopsCount['0'] ?? '—'}</span>
                  </div>
                  <div className="rd-stat">
                    <span className="rd-stat-label">Paradas (vuelta)</span>
                    <span className="rd-stat-value">{stopsCount['1'] ?? '—'}</span>
                  </div>
                </>
              )}
              {coverage300 !== null && (
                <div className="rd-stat">
                  <span className="rd-stat-label">Cobertura a 300 m</span>
                  <span className="rd-stat-value">{formatPax(coverage300)} hab</span>
                </div>
              )}
            </div>

            {scheduleTable && (scheduleTable.LA || scheduleTable.SA || scheduleTable.FE) && (
              <div className="rd-section">
                <div className="rd-section-title">Horario de servicio</div>
                <table className="rd-schedule-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Laborable</th>
                      <th>Sábado</th>
                      <th>Festivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Primera</td>
                      <td>{scheduleTable.LA?.primera ?? '—'}</td>
                      <td>{scheduleTable.SA?.primera ?? '—'}</td>
                      <td>{scheduleTable.FE?.primera ?? '—'}</td>
                    </tr>
                    <tr>
                      <td>Última</td>
                      <td>{scheduleTable.LA?.última ?? '—'}</td>
                      <td>{scheduleTable.SA?.última ?? '—'}</td>
                      <td>{scheduleTable.FE?.última ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {(la0 || la1 || sa0 || sa1 || fe0 || fe1) && (
              <div className="rd-section">
                <div className="rd-section-title">Expediciones por hora</div>
                {(la0 || la1) && (
                  <>
                    <div className="rd-hour-day-label">Laborable</div>
                    <HourChart row0={la0} row1={la1} color={routeColor} />
                  </>
                )}
                {(sa0 || sa1) && (
                  <>
                    <div className="rd-hour-day-label">Sábado</div>
                    <HourChart row0={sa0} row1={sa1} color={routeColor} />
                  </>
                )}
                {(fe0 || fe1) && (
                  <>
                    <div className="rd-hour-day-label">Festivo</div>
                    <HourChart row0={fe0} row1={fe1} color={routeColor} />
                  </>
                )}
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
