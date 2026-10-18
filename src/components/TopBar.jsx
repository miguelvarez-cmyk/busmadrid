import { useNetwork } from '../utils/network.js';
import IndicatorPicker from './IndicatorPicker.jsx';
import TimeControls from './TimeControls.jsx';
import LinesFilter from './LinesFilter.jsx';
import FilterChips from './FilterChips.jsx';

export default function TopBar({ onReset }) {
  const net = useNetwork();
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onReset} title="Restablecer la vista">
        Bus Madrid
      </button>
      {net ? (
        <>
          <IndicatorPicker />
          <span className="bar-sep" />
          <TimeControls />
          <span className="bar-sep" />
          <LinesFilter />
          <FilterChips />
        </>
      ) : (
        <span className="muted">Cargando…</span>
      )}
      <a className="topbar-link" href="#metodologia">
        Metodología
      </a>
    </header>
  );
}
