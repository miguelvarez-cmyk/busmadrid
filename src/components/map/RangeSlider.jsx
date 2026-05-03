import { useId } from 'react';

/**
 * Slider de rango con dos handles (min/max). Usa dos <input type="range">
 * superpuestos sobre un track común; el track-fill marca el rango activo.
 */
export default function RangeSlider({ min, max, step = 1, value, onChange, format }) {
  const id = useId();
  const [lo, hi] = value;
  const span = max - min || 1;
  const pctLo = ((lo - min) / span) * 100;
  const pctHi = ((hi - min) / span) * 100;

  const setLo = (v) => onChange([Math.min(v, hi), hi]);
  const setHi = (v) => onChange([lo, Math.max(v, lo)]);

  return (
    <div className="range-slider">
      <div className="track">
        <div className="track-fill" style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={lo}
        onChange={(e) => setLo(Number(e.target.value))}
        aria-labelledby={`${id}-min`}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={hi}
        onChange={(e) => setHi(Number(e.target.value))}
        aria-labelledby={`${id}-max`}
      />
      <div className="labels">
        <span id={`${id}-min`}>{format ? format(lo) : lo}</span>
        <span id={`${id}-max`}>{format ? format(hi) : hi}</span>
      </div>
    </div>
  );
}
