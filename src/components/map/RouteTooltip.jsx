import { useMemo } from 'react';
import { scheduleRangeFromMetrics } from '../../utils/service.js';

export default function RouteTooltip({
  activeRouteId,
  candidateIds,
  activeIdx,
  onSelectIdx,
  routesMeta,
  routeSpeed,
  routeDemand,
  serviceMetrics,
  dayOfWeek,
}) {
  if (!activeRouteId) return null;

  const routeMeta = useMemo(
    () => routesMeta?.find((r) => r.id === activeRouteId),
    [activeRouteId, routesMeta]
  );

  const speedData = useMemo(
    () => routeSpeed?.byRoute[activeRouteId],
    [activeRouteId, routeSpeed]
  );

  const demandData = useMemo(
    () => routeDemand?.byRoute[activeRouteId],
    [activeRouteId, routeDemand]
  );

  const scheduleRange = useMemo(
    () => scheduleRangeFromMetrics(serviceMetrics, activeRouteId, dayOfWeek),
    [serviceMetrics, activeRouteId, dayOfWeek]
  );

  if (!routeMeta) return null;

  return (
    <div className="hover-info">
      <div className="route-header">
        <span
          className="swatch"
          style={{ background: `#${routeMeta.color}` }}
        />
        <div className="route-name">
          <b>Línea {routeMeta.shortName}</b>
          <span className="long">{routeMeta.longName}</span>
        </div>
      </div>

      <div className="route-stats">
        {speedData && (
          <div className="stat-chip">
            <span className="label">Longitud</span>
            <span className="value">{speedData.lengthKm.toFixed(1)} km</span>
          </div>
        )}
        {scheduleRange && (
          <div className="stat-chip">
            <span className="label">Horario</span>
            <span className="value">{scheduleRange}</span>
          </div>
        )}
        {speedData && (
          <div className="stat-chip">
            <span className="label">Velocidad</span>
            <span className="value">{speedData.speedKmh.toFixed(1)} km/h</span>
          </div>
        )}
        {demandData && (
          <div className="stat-chip">
            <span className="label">Demanda</span>
            <span className="value">{demandData.dailyAvg.toLocaleString('es-ES')} pax</span>
          </div>
        )}
      </div>

      {candidateIds.length > 1 && (
        <div className="route-pills">
          <span className="pills-label">Otras líneas en este tramo:</span>
          <div className="pills">
            {candidateIds.map((id, idx) => {
              const meta = routesMeta?.find((r) => r.id === id);
              return (
                <button
                  key={id}
                  className={`route-pill ${idx === activeIdx ? 'active' : ''}`}
                  onClick={() => onSelectIdx(idx)}
                  title={`Ver línea ${meta?.shortName}`}
                >
                  {meta?.shortName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
