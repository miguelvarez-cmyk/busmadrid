import { useMemo, useState } from 'react';
import { useMapStore, useSelectedRouteIds } from '../../store/useMapStore.js';

export default function LineSelector({ routesMeta }) {
  const selected = useSelectedRouteIds();
  const toggleRoute = useMapStore((s) => s.toggleRoute);
  const selectAllRoutes = useMapStore((s) => s.selectAllRoutes);
  const clearRoutes = useMapStore((s) => s.clearRoutes);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const allIds = useMemo(() => routesMeta.map((r) => r.id), [routesMeta]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routesMeta;
    return routesMeta.filter(
      (r) =>
        r.shortName.toLowerCase().includes(q) ||
        r.longName.toLowerCase().includes(q)
    );
  }, [routesMeta, query]);

  const allShown = selected.size === 0 || selected.size === allIds.length;

  return (
    <div className="line-selector">
      <header>
        <h2>Líneas EMT</h2>
        <button
          className="collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? '▸' : '▾'}
        </button>
      </header>

      {!collapsed && (
        <>
          <div className="controls">
            <input
              type="text"
              placeholder="Buscar línea..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="bulk">
              <button onClick={() => selectAllRoutes(allIds)}>Todas</button>
              <button onClick={clearRoutes}>Ninguna</button>
            </div>
            <div className="status">
              {allShown
                ? `Mostrando todas (${routesMeta.length})`
                : `Mostrando ${selected.size} de ${routesMeta.length}`}
            </div>
          </div>

          <ul className="line-list">
            {filtered.map((r) => {
              const isOn = allShown || selected.has(r.id);
              return (
                <li key={r.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => {
                        if (allShown && selected.size === 0) {
                          const others = allIds.filter((id) => id !== r.id);
                          useMapStore.getState().selectAllRoutes(others);
                        } else {
                          toggleRoute(r.id);
                        }
                      }}
                    />
                    <span
                      className="swatch"
                      style={{ background: `#${r.color}` }}
                    />
                    <span className="short">{r.shortName}</span>
                    <span className="long">{r.longName}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
