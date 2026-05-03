import { useMemo, useRef, useState } from 'react';
import {
  useMapStore,
  useSelectedRouteIds,
  useHoveredRouteId,
  useBoxSelectMode,
} from '../../store/useMapStore.js';
import { groupRoutes, GROUP_LABELS, GROUP_ORDER } from '../../utils/routeGroups.js';

export default function LineSelector({ routesMeta }) {
  const selected = useSelectedRouteIds();
  const hovered = useHoveredRouteId();
  const toggleRoute = useMapStore((s) => s.toggleRoute);
  const setRangeSelection = useMapStore((s) => s.setRangeSelection);
  const selectAllRoutes = useMapStore((s) => s.selectAllRoutes);
  const clearRoutes = useMapStore((s) => s.clearRoutes);
  const setHoveredRouteId = useMapStore((s) => s.setHoveredRouteId);
  const boxSelectMode = useBoxSelectMode();
  const setBoxSelectMode = useMapStore((s) => s.setBoxSelectMode);

  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const anchorRef = useRef(null);

  const allIds = useMemo(() => routesMeta.map((r) => r.id), [routesMeta]);

  const { groups, visibleOrder } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (r) =>
      !q ||
      r.shortName.toLowerCase().includes(q) ||
      r.longName.toLowerCase().includes(q);
    const all = groupRoutes(routesMeta);
    const groups = {};
    const order = [];
    for (const key of GROUP_ORDER) {
      groups[key] = all[key].filter(matches);
      for (const r of groups[key]) order.push(r.id);
    }
    return { groups, visibleOrder: order };
  }, [routesMeta, query]);

  const handleClick = (e, id) => {
    if (e.shiftKey && anchorRef.current && anchorRef.current !== id) {
      e.preventDefault();
      const a = visibleOrder.indexOf(anchorRef.current);
      const b = visibleOrder.indexOf(id);
      if (a === -1 || b === -1) return;
      const [from, to] = a < b ? [a, b] : [b, a];
      const rangeIds = visibleOrder.slice(from, to + 1);
      const targetValue = !selected.has(id);
      setRangeSelection(rangeIds, targetValue);
    } else {
      toggleRoute(id);
      anchorRef.current = id;
    }
  };

  const groupSelectAll = (ids, value) => setRangeSelection(ids, value);

  const renderItem = (r) => {
    const isOn = selected.has(r.id);
    const isHovered = hovered === r.id;
    return (
      <li
        key={r.id}
        className={isHovered ? 'hovered' : ''}
        onMouseEnter={() => setHoveredRouteId(r.id)}
        onMouseLeave={() => setHoveredRouteId(null)}
      >
        <label>
          <input
            type="checkbox"
            checked={isOn}
            onClick={(e) => handleClick(e, r.id)}
            onChange={() => {}}
          />
          <span className="swatch" style={{ background: `#${r.color}` }} />
          <span className="short">{r.shortName}</span>
          <span className="long">{r.longName}</span>
        </label>
      </li>
    );
  };

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
            <button
              className={`box-toggle ${boxSelectMode ? 'on' : ''}`}
              onClick={() => setBoxSelectMode(!boxSelectMode)}
              title="Arrastra un recuadro en el mapa para añadir líneas. Mantén Ctrl para quitarlas."
            >
              {boxSelectMode ? '◼ Salir del modo área' : '▭ Selección por área'}
            </button>
            <div className="status">
              {selected.size} de {routesMeta.length} líneas visibles
              <span className="hint"> · Shift+clic = rango</span>
            </div>
          </div>

          <div className="line-list">
            {GROUP_ORDER.map((key) => {
              const items = groups[key];
              const ids = items.map((r) => r.id);
              const selectedInGroup = ids.filter((id) => selected.has(id)).length;
              return (
                <section key={key}>
                  <h3>
                    <span>{GROUP_LABELS[key]}</span>
                    <span className="count">
                      {selectedInGroup}/{items.length}
                    </span>
                    <span className="group-actions">
                      <button onClick={() => groupSelectAll(ids, true)}>+</button>
                      <button onClick={() => groupSelectAll(ids, false)}>−</button>
                    </span>
                  </h3>
                  {items.length === 0 ? (
                    <div className="empty">—</div>
                  ) : (
                    <ul>{items.map(renderItem)}</ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
