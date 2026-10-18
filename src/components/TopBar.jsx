import { useNetwork } from '../utils/network.js';
import { useMapStore, useTheme } from '../store/useMapStore.js';
import IndicatorPicker from './IndicatorPicker.jsx';
import TimeControls from './TimeControls.jsx';
import LinesFilter from './LinesFilter.jsx';
import FilterChips from './FilterChips.jsx';

export default function TopBar({ onReset }) {
  const net = useNetwork();
  const theme = useTheme();
  const setTheme = useMapStore((s) => s.setTheme);
  const setTourOpen = useMapStore((s) => s.setTourOpen);
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
      <button type="button" className="btn-sm btn-icon tour-btn" onClick={() => setTourOpen(true)} title="Guía" aria-label="Ver la guía">
        ?
      </button>
      <button
        type="button"
        className="btn-sm btn-icon theme-toggle"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>
    </header>
  );
}
