import { useCallback, useMemo, useState } from 'react';
import {
  useMapStore,
  useIndicator,
  useTableColumns,
  useSort,
  useFilters,
  usePinnedRouteIds,
  usePanelWide,
  DEFAULT_COLUMNS,
  MAX_PINNED,
} from '../store/useMapStore.js';
import { GROUPS, INDICATORS, INDICATOR_BY_ID, formatValue, colorFor, labelWithUnit, contextLabel, worstFirstDir } from '../utils/indicators.js';
import { useNetwork, useDismiss, compareLines } from '../utils/network.js';
import { exportLinesCsv, exportHourlyCsv, exportStopsCsv } from '../utils/csv.js';

function ColumnPicker() {
  const cols = useTableColumns();
  const setTableColumns = useMapStore((s) => s.setTableColumns);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const toggle = (id) => setTableColumns(cols.includes(id) ? cols.filter((c) => c !== id) : INDICATORS.map((i) => i.id).filter((c) => c === id || cols.includes(c)));
  return (
    <div className="popover-anchor" ref={ref}>
      <button type="button" className="btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>Columnas ▾</button>
      {open && (
        <div className="popover popover--right col-picker">
          {GROUPS.map((g) => (
            <div key={g.id} className="menu-group">
              <div className="menu-group-label">{g.label}</div>
              {INDICATORS.filter((i) => i.group === g.id).map((i) => (
                <label key={i.id} className="check">
                  <input type="checkbox" checked={cols.includes(i.id)} onChange={() => toggle(i.id)} />
                  {i.label}
                </label>
              ))}
            </div>
          ))}
          <div className="popover-foot">
            <button type="button" className="btn-link" onClick={() => setTableColumns(INDICATORS.map((i) => i.id))}>Todas</button>
            <button type="button" className="btn-link" onClick={() => setTableColumns(DEFAULT_COLUMNS)}>Por defecto</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CsvMenu({ rowIds }) {
  const net = useNetwork();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const { data, metaById, values, ctx, passing, fichaIds } = net;
  const profileIds = fichaIds.length ? fichaIds : rowIds;
  const run = (fn) => { fn(); setOpen(false); };
  return (
    <div className="popover-anchor" ref={ref}>
      <button type="button" className="btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>↓ CSV ▾</button>
      {open && (
        <div className="popover popover--right csv-menu">
          <button type="button" className="menu-item" onClick={() => run(() => exportLinesCsv({ routeIds: rowIds, metaById, values, ctx, demand: data.routeDemand }))}>
            Tabla visible <span className="menu-item-def">{rowIds.length} líneas · los 12 indicadores en el contexto activo</span>
          </button>
          <button type="button" className="menu-item" onClick={() => run(() => exportHourlyCsv({ routeIds: profileIds, metaById, data }))}>
            Perfiles horarios <span className="menu-item-def">{fichaIds.length ? `${fichaIds.length} línea(s) de la ficha` : `${rowIds.length} líneas de la tabla`} · expediciones y viajeros por hora</span>
          </button>
          <button type="button" className="menu-item" onClick={() => run(() => exportStopsCsv({ stopsGeojson: data.stopsGeojson, stopExpeditions: data.stopExpeditions, routeIdSet: passing, metaById }))}>
            Paradas <span className="menu-item-def">servidas por las líneas visibles · líneas y expediciones</span>
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderFilter({ ind }) {
  const filters = useFilters();
  const setFilter = useMapStore((s) => s.setFilter);
  const { stats } = useNetwork();
  const [pos, setPos] = useState(null);
  const open = pos != null;
  const close = useCallback(() => setPos(null), []);
  const ref = useDismiss(open, close);
  const cur = filters[ind.id];
  const toggleOpen = (e) => {
    e.stopPropagation();
    if (open) return close();
    // Posición fija: el contenedor de la tabla tiene scroll y recortaría el popover
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 228)) });
  };
  const step = 10 ** -ind.decimals;
  const parse = (s) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
  const set = (i, raw) => {
    const v = parse(raw);
    if (v != null && !isFinite(v)) return;
    const next = [...(cur ?? [null, null])];
    next[i] = v;
    setFilter(ind.id, next);
  };
  return (
    <span className="popover-anchor" ref={ref}>
      <button
        type="button"
        className={`th-filter ${cur ? 'th-filter--on' : ''}`}
        onClick={toggleOpen}
        aria-label={`Filtrar ${ind.label}`}
        title={`Filtrar ${ind.label}`}
      >
        ⏷
      </button>
      {open && (
        <div className="popover th-filter-pop" style={{ position: 'fixed', ...pos }} onClick={(e) => e.stopPropagation()}>
          <div className="th-filter-title">{labelWithUnit(ind)}</div>
          <div className="th-filter-row">
            <label>Mín.<input type="number" step={step} className="input" defaultValue={cur?.[0] ?? ''} placeholder={formatValue(ind, stats[ind.id].min)} onChange={(e) => set(0, e.target.value)} /></label>
            <label>Máx.<input type="number" step={step} className="input" defaultValue={cur?.[1] ?? ''} placeholder={formatValue(ind, stats[ind.id].max)} onChange={(e) => set(1, e.target.value)} /></label>
          </div>
          {cur && <button type="button" className="btn-link" onClick={() => { setFilter(ind.id, null); close(); }}>Quitar filtro</button>}
        </div>
      )}
    </span>
  );
}

export default function LinesTable() {
  const net = useNetwork();
  const { data, metaById, allIds, values, stats, passing, ctx } = net;
  const indicator = useIndicator();
  const cols = useTableColumns();
  const sort = useSort();
  const pinned = usePinnedRouteIds();
  const wide = usePanelWide();
  const { setSort, setClickedRouteId, setHoveredRouteIds, togglePin, openFicha, setPanelWide } = useMapStore.getState();
  const [query, setQuery] = useState('');

  const columns = useMemo(() => {
    const ids = indicator ? [indicator, ...cols.filter((c) => c !== indicator)] : cols;
    return ids.map((id) => INDICATOR_BY_ID[id]).filter(Boolean);
  }, [indicator, cols]);

  const rowIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    let ids = allIds.filter((id) => passing.has(id));
    if (q) ids = ids.filter((id) => metaById[id].shortName.toLowerCase().includes(q) || metaById[id].longName.toLowerCase().includes(q));
    const dir = sort.dir === 'asc' ? 1 : -1;
    if (sort.key === 'line') return ids.sort((a, b) => dir * compareLines(metaById[a].shortName, metaById[b].shortName));
    return ids.sort((a, b) => {
      const va = values[a][sort.key];
      const vb = values[b][sort.key];
      if (va == null && vb == null) return compareLines(metaById[a].shortName, metaById[b].shortName);
      if (va == null) return 1; // sin dato siempre al final
      if (vb == null) return -1;
      return dir * (va - vb);
    });
  }, [allIds, passing, query, sort, values, metaById]);

  const clickSort = (key) => {
    if (sort.key === key) setSort({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    else setSort({ key, dir: key === 'line' ? 'asc' : worstFirstDir(INDICATOR_BY_ID[key]) });
  };
  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div className="table-view">
      <div className="panel-toolbar">
        <div className="panel-title">
          Líneas <span className="muted">{rowIds.length}{rowIds.length !== allIds.length && ` de ${allIds.length}`}</span>
        </div>
        <input type="search" className="input input--small" placeholder="Buscar en la tabla…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar línea en la tabla" />
        <ColumnPicker />
        <CsvMenu rowIds={rowIds} />
        <button type="button" className="btn-sm btn-icon" onClick={() => setPanelWide(!wide)} title={wide ? 'Estrechar panel' : 'Ensanchar panel'} aria-label={wide ? 'Estrechar panel' : 'Ensanchar panel'}>
          {wide ? '⇥' : '⇤'}
        </button>
      </div>
      {pinned.length > 0 && (
        <div className="pinned-bar">
          <span>Fijadas: {pinned.map((id) => metaById[id]?.shortName).join(' · ')}</span>
          <button type="button" className="btn-sm btn-sm--on" onClick={openFicha}>Comparar ({pinned.length})</button>
        </div>
      )}
      <div className="table-scroll">
        <table className="lines-table">
          <thead>
            <tr>
              <th className="col-pin" aria-label="Fijar" />
              <th className="col-line" onClick={() => clickSort('line')} aria-sort={sort.key === 'line' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                Línea{arrow('line')}
              </th>
              {columns.map((ind) => {
                const c = contextLabel(ind, ctx, data.routeDemand);
                return (
                  <th
                    key={ind.id}
                    className={`num ${ind.id === indicator ? 'col-active' : ''}`}
                    onClick={() => clickSort(ind.id)}
                    title={`${labelWithUnit(ind, ctx)}${c ? ` · ${c}` : ''}\n${ind.def}`}
                    aria-sort={sort.key === ind.id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="th-label">{ind.short}{arrow(ind.id)}</span>
                    <span className="th-unit">{ind.id === 'coverage' ? `hab. ${ctx.radius} m` : ind.unit || ' '}</span>
                    <HeaderFilter ind={ind} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rowIds.map((id) => {
              const m = metaById[id];
              const isPinned = pinned.includes(id);
              return (
                <tr key={id} onClick={() => setClickedRouteId(id)} onMouseEnter={() => setHoveredRouteIds([id])} onMouseLeave={() => setHoveredRouteIds([])}>
                  <td className="col-pin">
                    <button
                      type="button"
                      className={`pin ${isPinned ? 'pin--on' : ''}`}
                      onClick={(e) => { e.stopPropagation(); togglePin(id); }}
                      disabled={!isPinned && pinned.length >= MAX_PINNED}
                      title={isPinned ? 'Quitar de la comparación' : 'Fijar para comparar'}
                      aria-pressed={isPinned}
                    >
                      📌
                    </button>
                  </td>
                  <td className="col-line" title={m.longName}>
                    <span className="swatch" style={{ background: `#${m.color}` }} />
                    <b className="line-num">{m.shortName}</b>
                    <span className="line-name">{m.longName}</span>
                  </td>
                  {columns.map((ind) => {
                    const v = values[id][ind.id];
                    const active = ind.id === indicator;
                    return (
                      <td key={ind.id} className={`num ${active ? 'col-active' : ''}`}>
                        {active && v != null && <i className="dot" style={{ background: `rgb(${colorFor(ind, stats[ind.id], v).join(',')})` }} />}
                        {formatValue(ind, v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rowIds.length === 0 && <div className="empty-state">Ninguna línea cumple el ámbito y los filtros.</div>}
      </div>
    </div>
  );
}
