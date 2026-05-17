import { useMemo } from 'react';
import { useMapStore } from '../../store/useMapStore.js';
import { scheduleRangeFromMetrics } from '../../utils/service.js';

export default function RouteTooltip({
  activeRouteId,
  candidateIds,
  activeIdx,
  onActiveIdxChange,
  routesMeta,
  routeSpeed,
  routeDemand,
  serviceMetrics,
  dayOfWeek,
  onTooltipMouseEnter,
  onTooltipMouseLeave,
}) {
  const setClickedRouteId = useMapStore((s) => s.setClickedRouteId);
  const setHoveredRouteIds = useMapStore((s) => s.setHoveredRouteIds);

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

  if (!activeRouteId || !routeMeta) return null;

  const hasMultiple = candidateIds.length > 1;

  function handleClose() {
    setClickedRouteId(null);
    setHoveredRouteIds([]);
  }

  function handlePrev() {
    onActiveIdxChange((activeIdx - 1 + candidateIds.length) % candidateIds.length);
  }

  function handleNext() {
    onActiveIdxChange((activeIdx + 1) % candidateIds.length);
  }

  return (
    <div
      className="hover-info"
      onMouseEnter={onTooltipMouseEnter}
      onMouseLeave={onTooltipMouseLeave}
    >
      <div className="route-header">
        <span
          className="swatch"
          style={{ background: `#${routeMeta.color}` }}
        />
        <div className="route-name">
          <b>Línea {routeMeta.shortName}</b>
          <span className="long">{routeMeta.longName}</span>
        </div>
        <button
          type="button"
          className="tooltip-close"
          onClick={handleClose}
          aria-label="Cerrar información de línea"
        >
          ×
        </button>
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

      {hasMultiple && (
        <div className="route-pills">
          <button
            type="button"
            className="line-nav-btn"
            onClick={handlePrev}
            aria-label="Línea anterior"
          >
            ←
          </button>
          <div className="pills">
            {candidateIds.map((id, idx) => {
              const meta = routesMeta?.find((r) => r.id === id);
              return (
                <span
                  key={id}
                  className={`route-pill ${idx === activeIdx ? 'active' : ''}`}
                  onClick={() => onActiveIdxChange(idx)}
                >
                  {meta?.shortName}
                </span>
              );
            })}
          </div>
          <span className="pills-label">{activeIdx + 1}/{candidateIds.length}</span>
          <button
            type="button"
            className="line-nav-btn"
            onClick={handleNext}
            aria-label="Línea siguiente"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
