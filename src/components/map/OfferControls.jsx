import { useMapStore, useColorMode, useTimeFilter } from '../../store/useMapStore.js';
import { offerColor } from '../../utils/service.js';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function rgbCss([r, g, b]) {
  return `rgb(${r},${g},${b})`;
}

function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

export default function OfferControls({ offerRange }) {
  const colorMode = useColorMode();
  const setColorMode = useMapStore((s) => s.setColorMode);
  const { dayOfWeek, startHour, endHour } = useTimeFilter();
  const setDayOfWeek = useMapStore((s) => s.setDayOfWeek);
  const setHourRange = useMapStore((s) => s.setHourRange);

  const enabled = colorMode === 'offer';

  const handleStart = (e) => {
    const v = Number(e.target.value);
    setHourRange(v, Math.max(endHour, v + 1));
  };
  const handleEnd = (e) => {
    const v = Number(e.target.value);
    setHourRange(Math.min(startHour, v - 1), v);
  };

  const stops = [0, 0.25, 0.5, 0.75, 1];
  const gradient = `linear-gradient(to right, ${stops
    .map((t) => rgbCss(offerColor(t)))
    .join(', ')})`;

  return (
    <div className={`offer-controls ${enabled ? 'on' : 'off'}`}>
      <header>
        <label className="toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setColorMode(e.target.checked ? 'offer' : 'route')}
          />
          <span>Calidad de oferta (exp/h)</span>
        </label>
      </header>

      <div className="body">
        <div className="row days">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              className={dayOfWeek === i ? 'active' : ''}
              onClick={() => setDayOfWeek(i)}
              disabled={!enabled}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="row hours">
          <div className="hour-input">
            <label>Desde</label>
            <input
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={handleStart}
              disabled={!enabled}
            />
            <span>{formatHour(startHour)}</span>
          </div>
          <div className="hour-input">
            <label>Hasta</label>
            <input
              type="number"
              min={1}
              max={24}
              value={endHour}
              onChange={handleEnd}
              disabled={!enabled}
            />
            <span>{formatHour(endHour)}</span>
          </div>
        </div>

        <div className="legend">
          <div className="bar" style={{ background: gradient }} />
          <div className="ticks">
            <span>{offerRange.min.toFixed(1)} exp/h</span>
            <span>{offerRange.max.toFixed(1)} exp/h</span>
          </div>
          <div className="caption">
            Rojo = menos expediciones · Verde = más expediciones · Gris = no opera
          </div>
        </div>
      </div>
    </div>
  );
}
