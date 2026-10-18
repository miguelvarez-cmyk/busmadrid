import { useEffect, useState } from 'react';
import { GROUPS, INDICATORS, DAY_TYPES, yearLabel, gradientCss } from '../utils/indicators.js';
import { useNetwork } from '../utils/network.js';

const COLOR_TEXT = {
  'good-low': 'verde = valor bajo (mejor) · rojo = valor alto',
  'good-high': 'verde = valor alto (mejor) · rojo = valor bajo',
  'bad-high': 'rojo = valor alto (peor) · verde = valor bajo',
  neutral: 'escala de un tono, sin juicio de valor: claro = más',
  diverging: 'rojo = descenso · gris = sin cambio · verde = aumento',
};
const DEP_TEXT = { day: 'tipo de día', hour: 'franja horaria', year: 'año', radius: 'radio a pie' };

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function Methodology() {
  const hash = useHash();
  const { data, allIds } = useNetwork();
  const open = hash.startsWith('#metodologia');

  useEffect(() => {
    if (!open) return;
    const target = document.getElementById(hash.slice(1));
    if (target && hash !== '#metodologia') target.scrollIntoView({ block: 'start' });
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hash]);

  if (!open) return null;

  const demand = data.routeDemand;
  const load = data.routeLoadHourly?.meta;
  const years = demand?.years ?? [];

  return (
    <div className="method-overlay" role="dialog" aria-modal="true" aria-labelledby="method-title">
      <div className="method-page" id="metodologia">
        <button type="button" className="method-close" onClick={close} aria-label="Cerrar metodología">× Cerrar</button>
        <h1 id="method-title">Metodología</h1>
        <p>
          Unidad de análisis: la <b>línea</b> EMT ({allIds.length} líneas en el GTFS vigente). Cada indicador se calcula para todas
          las líneas en el contexto activo (tipo de día, franja, año). Colores, mediana y percentiles se refieren siempre a la red completa, no a la selección, para que no cambien al filtrar.
        </p>

        <h2>Fuentes</h2>
        <ul>
          <li><b>Oferta y trazado:</b> GTFS de la EMT de Madrid (horarios, recorridos y paradas).</li>
          <li><b>Demanda anual y mensual:</b> EMT, viajeros por día, línea y franja (datos.emtmadrid.es). Años disponibles: {years.map((y) => yearLabel(demand, y)).join(', ')}.</li>
          {load && (
            <li>
              <b>Viajeros por hora:</b> misma fuente, {load.from} a {load.to}
              {load.excludedMonths?.length ? ', sin julio ni agosto' : ''}; {load.excludedDays} días atípicos excluidos. Días de referencia: {load.days.LA} laborables, {load.days.SA} sábados, {load.days.FE} domingos/festivos. No cambia con el selector de año.
            </li>
          )}
          <li><b>Flota:</b> EMT, coches en circulación por línea y franja ({data.routeFleet?.year ?? '2026'}).</li>
          <li><b>Población:</b> Ayuntamiento de Madrid, estructura demográfica por sección censal, asignada a edificios residenciales de OpenStreetMap.</li>
        </ul>

        <h2>Contexto</h2>
        <ul>
          <li><b>Tipo de día:</b> {DAY_TYPES.map((d) => d.label).join(' · ')}. En los indicadores de GTFS, «Laborable» es la media de lunes a viernes.</li>
          <li><b>Franja:</b> horas [inicio, fin). Solo afecta a los indicadores horarios (intervalo, viajeros/expedición).</li>
          <li><b>Año:</b> solo afecta a los indicadores de demanda anual.</li>
          <li>En la barra superior, el control que no afecta al indicador activo aparece atenuado, pero sigue aplicándose a la tabla y a la ficha.</li>
        </ul>

        <h2>Indicadores</h2>
        {GROUPS.map((g) => (
          <section key={g.id}>
            <h3>{g.label}</h3>
            {INDICATORS.filter((i) => i.group === g.id).map((ind) => (
              <article key={ind.id} id={`metodologia-${ind.id}`} className={`method-ind ${hash === `#metodologia-${ind.id}` ? 'method-ind--target' : ''}`}>
                <h4>{ind.label}{ind.unit && <span className="muted"> ({ind.unit})</span>}</h4>
                <p className="method-def">{ind.def}</p>
                <p>{ind.method}</p>
                <dl>
                  <dt>Fuente</dt><dd>{ind.source}</dd>
                  <dt>Depende de</dt><dd>{ind.deps.length ? ind.deps.map((d) => DEP_TEXT[d]).join(', ') : 'nada (valor fijo por línea)'}</dd>
                  <dt>Color</dt>
                  <dd>
                    <span className="method-ramp" style={{ background: gradientCss(ind) }} /> {COLOR_TEXT[ind.color]}
                    {ind.domain ? ` · escala fija ${ind.domain[0]}–${ind.domain[1]}` : ' · escala del percentil 2 al 98 de la red'}
                    {ind.scale === 'log' ? ' (logarítmica)' : ''}
                  </dd>
                </dl>
              </article>
            ))}
          </section>
        ))}

        <h2>Filtros</h2>
        <p>
          Los filtros se combinan (Y lógico) y pueden aplicarse a cualquier indicador, aunque no sea el que colorea el mapa. Una línea sin dato
          en un indicador filtrado no lo cumple. Las líneas que no cumplen se dibujan atenuadas en gris y desaparecen de la tabla.
          El histograma del mapa muestra la distribución de las líneas del ámbito que cumplen el resto de filtros.
        </p>

        <h2>Limitaciones</h2>
        <ul>
          <li>Velocidad, intervalo, expediciones y amplitud son valores programados (GTFS), no observados.</li>
          <li>Viajeros/expedición mide subidas por expedición, no ocupación a bordo ni carga máxima en el tramo crítico.</li>
          <li>Viajeros/día: la fuente solo distingue laborable y fin de semana; sábado y domingo/festivo comparten valor.</li>
          <li>Las líneas con datos de demanda que ya no existen en el GTFS vigente no se muestran.</li>
        </ul>
      </div>
    </div>
  );
}

function close() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
