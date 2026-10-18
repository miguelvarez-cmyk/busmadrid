import { useHoveredRouteIds, useHoveredStop, useIndicator } from '../store/useMapStore.js';
import { INDICATOR_BY_ID, formatValue, colorFor } from '../utils/indicators.js';
import { useNetwork } from '../utils/network.js';

/** Tooltip junto al cursor: líneas cercanas con el valor del indicador activo. */
export default function MapTooltip({ cursor }) {
  const hovered = useHoveredRouteIds();
  const stop = useHoveredStop();
  const indicator = useIndicator();
  const { metaById, values, stats } = useNetwork();
  const ind = indicator ? INDICATOR_BY_ID[indicator] : null;
  if (!cursor || (!hovered.length && !stop)) return null;

  // Cerca de los bordes, el tooltip cambia de lado para no salirse del mapa
  const flipX = cursor.w && cursor.x > cursor.w - 360;
  const flipY = cursor.h && cursor.y > cursor.h - 200;
  const style = {
    left: flipX ? undefined : cursor.x + 14,
    right: flipX ? cursor.w - cursor.x + 14 : undefined,
    top: flipY ? undefined : cursor.y + 14,
    bottom: flipY ? cursor.h - cursor.y + 14 : undefined,
  };

  return (
    <div className="map-tooltip" style={style}>
      {stop && (
        <div className="tt-stop">
          <b>Parada {stop.properties.stop_code || stop.properties.stop_id}</b> {stop.properties.stop_name}
          <div className="muted">
            {stop.properties.routes.length} líneas: {stop.properties.routes.map((r) => metaById[r]?.shortName ?? r).join(' · ')}
          </div>
        </div>
      )}
      {hovered.map((id, i) => {
        const m = metaById[id];
        if (!m) return null;
        const v = ind ? values[id]?.[ind.id] : null;
        const c = ind ? colorFor(ind, stats[ind.id], v) : null;
        return (
          <div key={id} className={`tt-row ${i === 0 ? 'tt-row--first' : ''}`}>
            <span className="swatch" style={{ background: `#${m.color}` }} />
            <b className="line-num">{m.shortName}</b>
            <span className="line-name">{m.longName}</span>
            {ind && (
              <span className="tt-val">
                <i className="dot" style={{ background: `rgb(${c.join(',')})` }} />
                {formatValue(ind, v)} {v != null && ind.unit}
              </span>
            )}
          </div>
        );
      })}
      {hovered.length > 0 && <div className="tt-hint muted">Clic: ficha de la línea {metaById[hovered[0]]?.shortName}</div>}
    </div>
  );
}
