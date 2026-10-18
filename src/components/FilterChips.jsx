import { useMapStore, useFilters } from '../store/useMapStore.js';
import { INDICATOR_BY_ID, filterLabel } from '../utils/indicators.js';
import { useNetwork } from '../utils/network.js';

export default function FilterChips() {
  const filters = useFilters();
  const { passing, allIds } = useNetwork();
  const { setFilter, clearFilters } = useMapStore.getState();
  const entries = Object.entries(filters);

  return (
    <div className="filter-chips">
      {entries.map(([id, range]) => {
        const ind = INDICATOR_BY_ID[id];
        return (
          <span key={id} className="chip chip--filter">
            {ind.label} <b>{filterLabel(ind, range)}</b>
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
