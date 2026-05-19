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
  demandYear,
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

  const demandAvg = useMemo(() => {
    if (!routeDemand || !activeRouteId) return null;
    const entry = routeDemand.byRoute[activeRouteId];
    if (!entry) return null;
    const y = demandYear ?? routeDemand.year ?? '2025';
    return entry.byYear?.[y]?.dailyAvg ?? entry.dailyAvg ?? null;
  }, [activeRouteId, routeDemand, demandYear]);

  const demandTrend = useMemo(() => {
    if (!routeDemand || !activeRouteId || !demandYear) return null;
    const entry = routeDemand.byRoute[activeRouteId];
    if (!entry?.byYear) return null;
    const curAvg = entry.byYear[demandYear]?.dailyAvg;
    const prevYear = String(Number(demandYear) - 1);
    const prevAvg = entry.byYear[prevYear]?.dailyAvg;
    if (!curAvg || !prevAvg) return null;
    const pct = ((curAvg - prevAvg) / prevAvg) * 100;
    return pct >= 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`;
  }, [activeRouteId, routeDemand, demandYear]);

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
        {demandAvg != null && (
          <div className="stat-chip">
            <span className="label">Demanda {demandYear}</span>
            <span className="value">
              {demandAvg.toLocaleString('es-ES')} pax
              {demandTrend && <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>{demandTrend}</span>}
            </span>
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
