import { useEffect, useState } from 'react';
import { formatValue } from '../utils/indicators.js';

// Acepta "10.949" (miles), "9,5" y también "9.5" (decimal con punto)
function parse(s) {
  let t = s.trim().replace(/\s|\+/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (t === '') return null;
  const v = Number(t);
  return isFinite(v) ? v : undefined;
}

/** Un extremo editable: muestra el valor formateado y acepta texto con coma decimal. */
function Bound({ ind, value, placeholder, label, onCommit }) {
  const shown = value == null ? '' : formatValue(ind, value);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => {
    const v = parse(text);
    if (v === undefined) return setText(shown);
    if (v !== value) onCommit(v);
  };
  const width = `${Math.max(2, (text || placeholder || '').length) + 0.6}ch`;
  return (
    <input
      className="bound"
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={text}
      placeholder={placeholder}
      style={{ width }}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { setText(shown); e.currentTarget.blur(); }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/**
 * Mín–máx editables por teclado. range = [min|null, max|null];
 * placeholders se muestran cuando el extremo está abierto.
 */
export default function RangeInputs({ ind, range, placeholders = ['', ''], onChange }) {
  const [lo, hi] = range;
  return (
    <span className="range-inputs">
      <Bound ind={ind} value={lo} placeholder={placeholders[0]} label={`Mínimo de ${ind.label}`} onCommit={(v) => onChange([v, hi])} />
      <span className="range-sep">–</span>
      <Bound ind={ind} value={hi} placeholder={placeholders[1]} label={`Máximo de ${ind.label}`} onCommit={(v) => onChange([lo, v])} />
    </span>
  );
}
