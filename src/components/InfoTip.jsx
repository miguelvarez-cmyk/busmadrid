import { INDICATOR_BY_ID } from '../utils/indicators.js';

/** ⓘ con la definición del indicador; enlaza a su entrada en la metodología. */
export default function InfoTip({ id }) {
  const ind = INDICATOR_BY_ID[id];
  if (!ind) return null;
  return (
    <a className="infotip" href={`#metodologia-${id}`} aria-label={`Definición de ${ind.label}`} onClick={(e) => e.stopPropagation()}>
      ⓘ
      <span className="infotip-body" role="tooltip">
        <b>{ind.label}</b>
        {ind.def}
        <span className="infotip-more">Metodología →</span>
      </span>
    </a>
  );
}
