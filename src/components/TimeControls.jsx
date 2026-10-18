import { useMapStore, useCtx, useIndicator } from '../store/useMapStore.js';
import { DAY_TYPES, INDICATOR_BY_ID, COVERAGE_RADII, yearLabel, pad2 } from '../utils/indicators.js';
import { useNetwork } from '../utils/network.js';

/** Contexto global: tipo de día, franja, año (y radio si procede). */
export default function TimeControls() {
  const { data } = useNetwork();
  const { dayType, startHour, endHour, year, radius } = useCtx();
  const indicator = useIndicator();
  const { setDayType, setHourRange, setYear, setRadius } = useMapStore.getState();
  const ind = indicator ? INDICATOR_BY_ID[indicator] : null;
  // Sin indicador activo todo cuenta (la tabla usa todos); con indicador se
  // atenúa lo que no le afecta, pero sigue operativo para la tabla y la ficha
  const affects = (dep) => !ind || ind.deps.includes(dep);
  const offTitle = (dep, base) => (affects(dep) ? base : `${base} · no afecta a ${ind.label}`);
  const years = data.routeDemand?.years ?? [];
  const fullDay = startHour === 0 && endHour === 24;

  return (
    <div className="time-controls">
      <div className={`seg ${affects('day') ? '' : 'is-off'}`} role="radiogroup" aria-label="Tipo de día" title={offTitle('day', 'Tipo de día')}>
        {DAY_TYPES.map((d) => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={dayType === d.id}
            className={dayType === d.id ? 'on' : ''}
            onClick={() => setDayType(d.id)}
            title={d.label}
          >
            {d.short}
          </button>
        ))}
      </div>

      <div className={`hours ${affects('hour') ? '' : 'is-off'}`} title={offTitle('hour', 'Franja horaria')}>
        <select
          aria-label="Hora de inicio"
          value={startHour}
          onChange={(e) => {
            const s = +e.target.value;
            setHourRange(s, Math.max(endHour, s + 1));
          }}
        >
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad2(h)}</option>)}
        </select>
        <span>–</span>
        <select
          aria-label="Hora de fin"
          value={endHour}
          onChange={(e) => {
            const en = +e.target.value;
            setHourRange(Math.min(startHour, en - 1), en);
          }}
        >
          {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{pad2(h)}</option>)}
        </select>
        <button
          type="button"
          className={`btn-xs ${fullDay ? 'btn-xs--on' : ''}`}
          onClick={() => setHourRange(0, 24)}
          title="Franja de día completo"
        >
          24 h
        </button>
      </div>

      {years.length > 0 && (
        <select
          className={`ctl ${affects('year') ? '' : 'is-off'}`}
          aria-label="Año de demanda"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          title={offTitle('year', 'Año de los datos de demanda')}
        >
          {years.map((y) => <option key={y} value={y}>{yearLabel(data.routeDemand, y)}</option>)}
        </select>
      )}

      {indicator === 'coverage' && (
        <select className="ctl" aria-label="Radio a pie" value={radius} onChange={(e) => setRadius(+e.target.value)} title="Distancia máxima a pie hasta la parada">
          {COVERAGE_RADII.map((r) => <option key={r} value={r}>{r} m a pie</option>)}
        </select>
      )}
    </div>
  );
}
