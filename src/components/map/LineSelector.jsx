import { useMemo, useRef, useState } from 'react';
import {
  useMapStore,
  useSelectedRouteIds,
  useHoveredRouteId,
} from '../../store/useMapStore.js';

function isNightLine(shortName) {
  return /^N/i.test(shortName);
}

export default function LineSelector({ routesMeta }) {
  const selected = useSelectedRouteIds();
  const hovered = useHoveredRouteId();
  const toggleRoute = useMapStore((s) => s.toggleRoute);
  const setRangeSelection = useMapStore((s) => s.setRangeSelection);
  const selectAllRoutes = useMapStore((s) => s.selectAllRoutes);
  const clearRoutes = useMapStore((s) => s.clearRoutes);
  const setHoveredRouteId = useMapStore((s) => s.setHoveredRouteId);

  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const anchorRef = useRef(null);

  const allIds = useMemo(() => routesMeta.map((r) => r.id), [routesMeta]);

  const { day, night, visibleOrder } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (r) =>
      !q ||
      r.shortName.toLowerCase().includes(q) ||
      r.longName.toLowerCase().includes(q);
    const day = routesMeta.filter((r) => !isNightLine(r.shortName) && matches(r));
    const night = routesMeta.filter((r) => isNightLine(r.shortName) && matches(r));
    return { day, night, visibleOrder: [...day, ...night].map((r) => r.id) };
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
            <div className="status">
              {selected.size} de {routesMeta.length} líneas visibles
              <span className="hint"> · Shift+clic para rango</span>
            </div>
          </div>

          <div className="line-list">
            <section>
              <h3>Diurnas <span className="count">({day.length})</span></h3>
              <ul>{day.map(renderItem)}</ul>
            </section>
            <section>
              <h3>Nocturnas <span className="count">({night.length})</span></h3>
              <ul>{night.map(renderItem)}</ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
