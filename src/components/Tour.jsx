import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useMapStore, useTourOpen } from '../store/useMapStore.js';
import {
  AnimWelcome,
  AnimIndicator,
  AnimContext,
  AnimFilter,
  AnimLines,
  AnimTable,
  AnimFicha,
  AnimLayers,
  AnimExport,
  AnimMethod,
  AnimDone,
} from './TourAnims.jsx';

const DONE_KEY = 'busmadrid-tour-done';

// target: selectores del elemento a resaltar (sin target → tarjeta centrada)
const STEPS = [
  { title: 'Bus Madrid', text: 'Diagnóstico de las líneas de la EMT. Te lo enseñamos en un minuto.', Anim: AnimWelcome },
  { target: ['.indicator-picker'], title: 'Elige qué medir', text: 'Intervalo, demanda, velocidad… El mapa se colorea según el indicador.', Anim: AnimIndicator },
  { target: ['.time-controls'], title: 'Elige cuándo', text: 'Tipo de día, franja horaria y año. Valen para todo.', Anim: AnimContext },
  {
    target: ['.legend'],
    title: 'Filtra por valor',
    text: 'Arrastra los extremos o escribe un número. Lo que no cumple queda en gris.',
    Anim: AnimFilter,
    // La leyenda solo existe con un indicador activo
    before: () => {
      const s = useMapStore.getState();
      if (!s.indicator) {
        s.setIndicator('interval');
        s.setSort({ key: 'interval', dir: 'desc' });
      }
    },
  },
  { target: ['.lines-filter'], title: 'Elige qué líneas', text: 'Busca, marca grupos o dibuja un rectángulo en el mapa.', Anim: AnimLines },
  { target: ['.lines-table thead', '.panel-toolbar'], title: 'Compara en la tabla', text: 'Ordena por cualquier columna. Añade más en «Columnas».', Anim: AnimTable },
  { target: ['.lines-table tbody tr:nth-child(-n+3)'], title: 'Abre la ficha', text: 'Clic en una línea para ver todos sus datos. Fíjala con 📌 para compararla.', Anim: AnimFicha },
  { target: ['.layers'], title: 'Mapa y paradas', text: 'Cambia el mapa base o muestra las paradas.', Anim: AnimLayers },
  { target: ['.csv-anchor'], title: 'Descarga los datos', text: 'La tabla, los perfiles horarios o las paradas, en CSV.', Anim: AnimExport },
  { target: ['.topbar-link', '.theme-toggle'], title: 'Cómo se calcula', text: '«Metodología» explica cada indicador. ☀ cambia a modo claro.', Anim: AnimMethod },
  { target: ['.tour-btn'], title: 'Listo', text: 'Vuelve a ver esta guía cuando quieras con el botón ?.', Anim: AnimDone },
];

const PAD = 6;
const CARD_W = 300;
const CARD_H = 230;

/** Rectángulo que engloba todos los elementos visibles de los selectores. */
function targetRect(selectors) {
  if (!selectors) return null;
  let r = null;
  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      r = r
        ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) }
        : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    }
  }
  if (!r) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  if (r.right < 0 || r.left > vw || r.bottom < 0 || r.top > vh) return null;
  return { left: r.left - PAD, top: r.top - PAD, width: r.right - r.left + 2 * PAD, height: r.bottom - r.top + 2 * PAD };
}

/** Tarjeta junto al objetivo: debajo, encima, a la izquierda o a la derecha, según quepa. */
function cardPosition(rect) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(CARD_W, vw - 24);
  if (!rect) return { left: (vw - w) / 2, top: Math.max(12, (vh - CARD_H) / 2), width: w };
  const clampX = (x) => Math.max(12, Math.min(x, vw - w - 12));
  const clampY = (y) => Math.max(12, Math.min(y, vh - CARD_H - 12));
  if (rect.top + rect.height + 12 + CARD_H < vh) return { left: clampX(rect.left), top: rect.top + rect.height + 12, width: w };
  if (rect.top - 12 - CARD_H > 0) return { left: clampX(rect.left), top: rect.top - 12 - CARD_H, width: w };
  if (rect.left - 12 - w > 0) return { left: rect.left - 12 - w, top: clampY(rect.top), width: w };
  return { left: clampX(rect.left + rect.width + 12), top: clampY(rect.top), width: w };
}

export default function Tour({ ready }) {
  const open = useTourOpen();
  const setTourOpen = useMapStore((s) => s.setTourOpen);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  // Primera visita: se abre sola cuando la página está lista
  useEffect(() => {
    if (!ready) return;
    let done = false;
    try { done = localStorage.getItem(DONE_KEY) === '1'; } catch { /* sin almacenamiento */ }
    if (!done) setTourOpen(true);
  }, [ready, setTourOpen]);

  useEffect(() => { if (open) setI(0); }, [open]);

  const close = useCallback(() => {
    try { localStorage.setItem(DONE_KEY, '1'); } catch { /* sin almacenamiento */ }
    setTourOpen(false);
  }, [setTourOpen]);

  const step = STEPS[i];

  // Coloca el foco: ejecuta la preparación del paso y mide tras el repintado
  useLayoutEffect(() => {
    if (!open) return;
    step.before?.();
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setRect(targetRect(step.target)));
    });
    const onResize = () => setRect(targetRect(step.target));
    // Segunda medida: el objetivo puede tardar en aparecer o moverse
    const t = setTimeout(onResize, 500);
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [open, step]);

  const next = useCallback(() => (i < STEPS.length - 1 ? setI(i + 1) : close()), [i, close]);
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, next, prev, close]);

  if (!open) return null;
  const pos = cardPosition(rect);
  const last = i === STEPS.length - 1;
  const { Anim } = step;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className={`tour-spot ${rect ? '' : 'tour-spot--none'}`} style={rect ?? undefined} />
      <div className="tour-card" style={pos} key={i}>
        <button type="button" className="tour-skip" onClick={close}>Saltar</button>
        <Anim />
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.text}</p>
        <div className="tour-foot">
          <div className="tour-dots" aria-label={`Paso ${i + 1} de ${STEPS.length}`}>
            {STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}
          </div>
          {i > 0 && <button type="button" className="btn-sm" onClick={prev}>Atrás</button>}
          <button type="button" className="btn-sm btn-primary" onClick={next} autoFocus>
            {i === 0 ? 'Empezar' : last ? 'Usar la web' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
