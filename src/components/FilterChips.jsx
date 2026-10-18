import { useMapStore, useFilters } from '../store/useMapStore.js';
import { INDICATOR_BY_ID, formatValue } from '../utils/indicators.js';
import { useNetwork } from '../utils/network.js';
import RangeInputs from './RangeInputs.jsx';

export default function FilterChips() {
  const filters = useFilters();
  const { passing, allIds, stats } = useNetwork();
  const { setFilter, clearFilters } = useMapStore.getState();
  const entries = Object.entries(filters);

  return (
    <div className="filter-chips">
      {entries.map(([id, range]) => {
        const ind = INDICATOR_BY_ID[id];
        return (
          <span key={id} className="chip chip--filter">
            {ind.label}
            <RangeInputs
              ind={ind}
              range={range}
              placeholders={[formatValue(ind, stats[id].min), formatValue(ind, stats[id].max)]}
              onChange={(r) => setFilter(id, r)}
            />
            {ind.unit && <span className="chip-unit">{ind.unit}</span>}
            <button type="button" className="chip-x" onClick={() => setFilter(id, null)} aria-label={`Quitar filtro de ${ind.label}`}>
              ×
            </button>
          </span>
        );
      })}
      {entries.length > 1 && (
        <button type="button" className="btn-link" onClick={clearFilters}>
          Quitar filtros
        </button>
      )}
      {passing.size < allIds.length && (
        <span className="pass-count" title="Líneas que cumplen el ámbito y los filtros">
          {passing.size} de {allIds.length} líneas
        </span>
      )}
    </div>
  );
}
