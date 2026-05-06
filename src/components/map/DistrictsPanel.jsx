import { useMemo, useState } from 'react';
import { useMapStore, useSelectedRouteIds } from '../../store/useMapStore.js';

function selectionState(routeIds, selected) {
  if (routeIds.length === 0) return 'none';
  const n = routeIds.filter((id) => selected.has(id)).length;
  if (n === 0) return 'none';
  if (n === routeIds.length) return 'all';
  return 'partial';
}

function IndeterminateCheckbox({ state, onChange }) {
  return (
    <input
      type="checkbox"
      checked={state === 'all'}
      ref={(el) => { if (el) el.indeterminate = state === 'partial'; }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function DistrictsPanel({ routeDistricts }) {
  const selected = useSelectedRouteIds();
  const setRangeSelection = useMapStore((s) => s.setRangeSelection);
  const [expandedDistricts, setExpandedDistricts] = useState(() => new Set());

  const distritos = useMemo(
    () => routeDistricts?.distritos ?? [],
    [routeDistricts]
  );

  const toggleExpand = (id) =>
    setExpandedDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggle = (routeIds, state) =>
    setRangeSelection(routeIds, state !== 'all');

  if (!routeDistricts) return (
    <div className="districts-empty">
      <p>Ejecuta <code>python scripts/compute_districts.py</code> para generar el mapa de zonas.</p>
    </div>
  );

  return (
    <div className="districts-panel">
      {distritos.map((dist) => {
        const distState = selectionState(dist.routeIds, selected);
        const isExpanded = expandedDistricts.has(dist.id);
        const selectedN = dist.routeIds.filter((id) => selected.has(id)).length;

        return (
          <div key={dist.id} className="district-item">
            <div className="district-header">
              <IndeterminateCheckbox
                state={distState}
                onChange={() => toggle(dist.routeIds, distState)}
              />
              <button
                type="button"
                className="district-toggle"
                onClick={() => toggleExpand(dist.id)}
              >
                <span className="district-name">{dist.nombre}</span>
                <span className="district-count">
                  {selectedN}/{dist.routeIds.length}
                </span>
                <span className="district-arrow">{isExpanded ? '▾' : '▸'}</span>
              </button>
            </div>

            {isExpanded && (
              <div className="barrios-list">
                {dist.barrios.map((barrio) => {
                  const barState = selectionState(barrio.routeIds, selected);
                  const barN = barrio.routeIds.filter((id) => selected.has(id)).length;
                  return (
                    <div key={barrio.id} className="barrio-item">
                      <label>
                        <IndeterminateCheckbox
                          state={barState}
                          onChange={() => toggle(barrio.routeIds, barState)}
                        />
                        <span className="barrio-name">{barrio.nombre}</span>
                        <span className="barrio-count">
                          {barN}/{barrio.routeIds.length}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
