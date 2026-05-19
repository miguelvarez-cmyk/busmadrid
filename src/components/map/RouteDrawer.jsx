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
              style={{ height: `${Math.max(2, Math.round((v / maxV) * 48))}px`, background: color, opacity: v > 0 ? 1 : 0.12 }}
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

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function MonthChart({ monthlyData, color }) {
  const bars = useMemo(() => {
    if (!monthlyData) return [];
    const result = [];
    const years = Object.keys(monthlyData).sort();
    for (const year of years) {
      const months = monthlyData[year];
      for (let i = 0; i < 12; i++) {
        const v = months[i];
        result.push({ year, month: i, v: v ?? null, label: `${MONTH_NAMES[i]} ${year.slice(2)}` });
      }
    }
    // recortar nulos del final
    let last = result.length - 1;
    while (last >= 0 && result[last].v === null) last--;
    return result.slice(0, last + 1);
  }, [monthlyData]);

  if (!bars.length) return null;

  const maxV = Math.max(1, ...bars.map((b) => b.v ?? 0));

  // posiciones de etiquetas de año: primer bar de cada año
  const yearLabels = [];
  let prevYear = null;
  bars.forEach((b, i) => {
    if (b.year !== prevYear) {
      yearLabels.push({ i, year: `'${b.year.slice(2)}` });
      prevYear = b.year;
    }
  });

  return (
    <div className="rd-month-chart">
      <div className="rd-month-chart-inner">
        <div className="rd-hour-yaxis">
          <span>{Math.round(maxV / 1000)}k</span>
          <span>0</span>
        </div>
        <div className="rd-month-bars">
          {bars.map((b, i) => (
            <div
              key={i}
              className="rd-month-bar"
              style={{
                height: b.v !== null ? `${Math.max(2, Math.round((b.v / maxV) * 72))}px` : '2px',
                background: color,
                opacity: b.v !== null ? 1 : 0.12,
              }}
              title={b.v !== null ? `${b.label} — ${Math.round(b.v).toLocaleString('es-ES')} viaj/día` : b.label}
              role="img"
              aria-label={b.label}
            />
          ))}
        </div>
      </div>
      <div className="rd-month-labels">
        {yearLabels.map(({ i, year }) => (
          <span key={year} style={{ left: `${(i / bars.length) * 100}%` }}>{year}</span>
        ))}
      </div>
    </div>
  );
}

export default function RouteDrawer({
  routesMeta,
  routeSpeed,
  routeDemand,
  demandYear,
  routeCoverage,
  serviceMetrics,
  routesGeojson,
  routeDepartureTimes,
}) {
  const clickedRouteId = useClickedRouteId();
  const setClickedRouteId = useMapStore((s) => s.setClickedRouteId);
  const setViewState = useSetViewState();

  const isOpen = Boolean(clickedRouteId);

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
  const monthlyData = useMemo(() => routeDemand?.byRoute?.[clickedRouteId]?.monthly ?? null, [clickedRouteId, routeDemand]);

  // Horario exacto desde route_departure_times; fallback a scheduleTableFromMetrics
  const scheduleTable = useMemo(() => {
    const exact = routeDepartureTimes?.byRoute?.[clickedRouteId];
    if (exact) {
      return {
        LA: exact.LA ? { primera: exact.LA.primera, última: exact.LA.última } : null,
        SA: exact.SA ? { primera: exact.SA.primera, última: exact.SA.última } : null,
        FE: exact.FE ? { primera: exact.FE.primera, última: exact.FE.última } : null,
      };
    }
    return scheduleTableFromMetrics(serviceMetrics, clickedRouteId);
  }, [clickedRouteId, routeDepartureTimes, serviceMetrics]);

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

  // Población a 300 M redondeada a miles
  const coverage300Fmt = coverage300 !== null
    ? (Math.round(coverage300 / 1000) * 1000).toLocaleString('es-ES')
    : null;

  // Demanda: entero exacto sin unidades
  const demandFmt = demandAvg != null
    ? Math.round(demandAvg).toLocaleString('es-ES')
    : null;

  const year = demandYear ?? '2025';

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
              {/* Fila 1: Longitud | Duración | Velocidad */}
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
              {/* Fila 2: Paradas ida | Paradas vuelta (ocupa 2 de 3 cols) */}
              {stopsCount && (
                <>
                  <div className="rd-stat">
                    <span className="rd-stat-label">Paradas (ida)</span>
                    <span className="rd-stat-value">{stopsCount['0'] ?? '—'}</span>
                  </div>
                  <div className="rd-stat rd-stat--wide">
                    <span className="rd-stat-label">Paradas (vuelta)</span>
                    <span className="rd-stat-value">{stopsCount['1'] ?? '—'}</span>
                  </div>
                </>
              )}
              {/* Fila 3: Población a 300 M | Demanda media diaria */}
              {coverage300Fmt !== null && (
                <div className="rd-stat">
                  <span className="rd-stat-label">Población a 300 M</span>
                  <span className="rd-stat-value">{coverage300Fmt}</span>
                </div>
              )}
              {demandFmt !== null && (
                <div className="rd-stat rd-stat--wide">
                  <span className="rd-stat-label">Demanda media diaria {year}</span>
                  <span className="rd-stat-value">{demandFmt}</span>
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

            {monthlyData && (
              <div className="rd-section">
                <div className="rd-section-title">Viajeros por mes</div>
                <MonthChart monthlyData={monthlyData} color={routeColor} />
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
