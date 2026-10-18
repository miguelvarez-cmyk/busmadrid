import { useCallback, useState } from 'react';
import { useMapStore, useIndicator } from '../store/useMapStore.js';
import { GROUPS, INDICATORS, INDICATOR_BY_ID, worstFirstDir } from '../utils/indicators.js';
import { useDismiss } from '../utils/network.js';
import InfoTip from './InfoTip.jsx';

export default function IndicatorPicker() {
  const indicator = useIndicator();
  const setIndicator = useMapStore((s) => s.setIndicator);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const current = indicator ? INDICATOR_BY_ID[indicator] : null;

  const choose = (id) => {
    setIndicator(id);
    if (id) useMapStore.getState().setSort({ key: id, dir: worstFirstDir(INDICATOR_BY_ID[id]) });
    setOpen(false);
  };

  return (
    <div className="indicator-picker popover-anchor" ref={ref}>
      <button
        type="button"
        className={`picker-btn ${current ? '' : 'picker-btn--empty'}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {current ? (
          <>
            <span className="muted">{GROUPS.find((g) => g.id === current.group).label} ·</span>
            <b>{current.label}</b>
            {current.unit && <span className="muted">({current.unit})</span>}
          </>
        ) : (
          <span>Elegir indicador</span>
        )}
        <span className="caret">▾</span>
      </button>
      {current && <InfoTip id={current.id} />}
      {open && (
        <div className="popover indicator-menu" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={!indicator}
            className={`menu-item ${!indicator ? 'menu-item--on' : ''}`}
            onClick={() => choose(null)}
          >
            Ninguno <span className="muted">· colores de línea</span>
          </button>
          {GROUPS.map((g) => (
            <div key={g.id} className="menu-group">
              <div className="menu-group-label">{g.label}</div>
              {INDICATORS.filter((i) => i.group === g.id).map((i) => (
                <button
                  key={i.id}
                  type="button"
                  role="option"
                  aria-selected={indicator === i.id}
                  className={`menu-item ${indicator === i.id ? 'menu-item--on' : ''}`}
                  onClick={() => choose(i.id)}
                >
                  <span>
                    {i.label}
                    {i.unit && <span className="muted"> · {i.unit}</span>}
                  </span>
                  <span className="menu-item-def">{i.def}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
