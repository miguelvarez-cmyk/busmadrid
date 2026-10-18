import { useCallback, useMemo, useRef, useState } from 'react';
import { useMapStore, useSelectedRouteIds, useBoxSelectMode } from '../store/useMapStore.js';
import { groupRoutes, GROUP_LABELS, GROUP_ORDER } from '../utils/routeGroups.js';
import { useNetwork, useDismiss } from '../utils/network.js';

/** Filtro "Líneas": buscar, elegir por grupo o por rectángulo en el mapa. */
export default function LinesFilter() {
  const { data, allIds } = useNetwork();
  const selected = useSelectedRouteIds();
  const boxSelectMode = useBoxSelectMode();
  const { toggleRoute, setRangeSelection, selectAllRoutes, clearRoutes, setBoxSelectMode } = useMapStore.getState();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const anchorRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  const { groups, order } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = groupRoutes(data.routesMeta);
    const groups = {};
    const order = [];
    for (const key of GROUP_ORDER) {
      groups[key] = all[key].filter((r) => !q || r.shortName.toLowerCase().includes(q) || r.longName.toLowerCase().includes(q));
      for (const r of groups[key]) order.push(r.id);
    }
    return { groups, order };
  }, [data, query]);

  const onItemClick = (e, id) => {
    if (e.shiftKey && anchorRef.current && anchorRef.current !== id) {
      e.preventDefault();
      const a = order.indexOf(anchorRef.current);
      const b = order.indexOf(id);
      if (a === -1 || b === -1) return;
      const [from, to] = a < b ? [a, b] : [b, a];
      setRangeSelection(order.slice(from, to + 1), !selected.has(id));
    } else {
      toggleRoute(id);
      anchorRef.current = id;
    }
  };

  const toggleExpanded = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const all = selected.size === allIds.length;
  const searching = query.trim() !== '';

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        type="button"
        className={`chip ${all ? '' : 'chip--active'}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Líneas <b>{all ? 'todas' : `${selected.size}/${allIds.length}`}</b> ▾
      </button>
      {open && (
        <div className="popover lines-popover">
          <input
            type="search"
            className="input"
            placeholder="Buscar línea o nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="lines-actions">
            <button type="button" className="btn-sm" onClick={() => selectAllRoutes(allIds)}>Todas</button>
            <button type="button" className="btn-sm" onClick={clearRoutes}>Ninguna</button>
            <button
              type="button"
              className={`btn-sm ${boxSelectMode ? 'btn-sm--on' : ''}`}
              onClick={() => { setBoxSelectMode(!boxSelectMode); setOpen(false); }}
              title="Arrastra un recuadro en el mapa para añadir líneas; con Ctrl, para quitarlas"
            >
              ▭ Rectángulo en el mapa
            </button>
          </div>
          <div className="lines-list">
            {GROUP_ORDER.map((key) => {
              const items = groups[key];
              if (!items.length) return null;
              const ids = items.map((r) => r.id);
              const n = ids.filter((id) => selected.has(id)).length;
              const isOpen = searching || expanded.has(key);
              return (
                <section key={key}>
                  <div className="lines-group">
                    <button type="button" className="lines-group-toggle" onClick={() => toggleExpanded(key)}>
                      <span className="caret">{isOpen ? '▾' : '▸'}</span>
                      {GROUP_LABELS[key]}
                      <span className="lines-count">{n}/{items.length}</span>
                    </button>
                    <button type="button" className="btn-xs" onClick={() => setRangeSelection(ids, true)} title="Añadir grupo">+</button>
                    <button type="button" className="btn-xs" onClick={() => setRangeSelection(ids, false)} title="Quitar grupo">−</button>
                  </div>
                  {isOpen && (
                    <ul>
                      {items.map((r) => (
                        <li key={r.id}>
                          <label>
                            <input type="checkbox" checked={selected.has(r.id)} onClick={(e) => onItemClick(e, r.id)} onChange={() => {}} />
                            <span className="swatch" style={{ background: `#${r.color}` }} />
                            <b className="line-num">{r.shortName}</b>
                            <span className="line-name">{r.longName}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
