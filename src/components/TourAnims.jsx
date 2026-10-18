// Animaciones de la guía: SVG 160×72 con animación CSS (clases .ta-*)

const W = 160;
const H = 72;
const svg = (children) => (
  <svg className="tour-anim" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
    {children}
  </svg>
);

/** Líneas de bus que se dibujan sobre el mapa. */
export function AnimWelcome() {
  return svg(
    <>
      <path className="ta-draw ta-d1" d="M8 58 C40 50 50 20 80 22 S130 40 152 12" />
      <path className="ta-draw ta-d2" d="M10 20 C40 30 70 60 100 52 S140 50 150 62" />
      <path className="ta-draw ta-d3" d="M30 66 L60 10" />
    </>
  );
}

/** Las líneas cambian de color al elegir indicador. */
export function AnimIndicator() {
  return svg(
    <>
      <rect className="ta-chip" x="44" y="4" width="72" height="16" rx="4" />
      <text className="ta-text" x="80" y="15.5" textAnchor="middle">Indicador ▾</text>
      <path className="ta-line ta-c1" d="M10 62 C40 40 60 50 90 36 S140 30 152 40" />
      <path className="ta-line ta-c2" d="M10 40 C40 52 70 66 100 58 S140 60 152 66" />
      <path className="ta-line ta-c3" d="M20 70 C40 50 50 36 70 30" />
    </>
  );
}

/** Pastilla que salta entre tipos de día y franja que se desplaza. */
export function AnimContext() {
  return svg(
    <>
      <rect className="ta-track" x="16" y="10" width="128" height="18" rx="5" />
      <rect className="ta-pill" x="18" y="12" width="40" height="14" rx="4" />
      <text className="ta-text" x="38" y="22.5" textAnchor="middle">Lab.</text>
      <text className="ta-text" x="80" y="22.5" textAnchor="middle">Sáb.</text>
      <text className="ta-text" x="122" y="22.5" textAnchor="middle">Dom.</text>
      <line className="ta-axis" x1="16" y1="54" x2="144" y2="54" />
      <rect className="ta-band" x="40" y="44" width="30" height="20" rx="3" />
    </>
  );
}

/** Histograma con dos tiradores que acotan el filtro. */
export function AnimFilter() {
  const bars = [10, 18, 30, 42, 36, 26, 20, 14, 9, 6, 4];
  return svg(
    <>
      {bars.map((h, i) => (
        <rect key={i} className={`ta-bar ${i < 3 || i > 7 ? 'ta-bar-out' : ''}`} x={14 + i * 12} y={52 - h} width="10" height={h} rx="1" />
      ))}
      <line className="ta-axis" x1="12" y1="56" x2="148" y2="56" />
      <rect className="ta-handle ta-h1" x="10" y="50" width="6" height="14" rx="2" />
      <rect className="ta-handle ta-h2" x="144" y="50" width="6" height="14" rx="2" />
    </>
  );
}

/** Casillas de líneas que se marcan y desmarcan. */
export function AnimLines() {
  return svg(
    <>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(30 ${8 + i * 21})`}>
          <rect className="ta-box" width="14" height="14" rx="3" />
          <path className={`ta-check ta-k${i}`} d="M3 7 L6 10 L11 4" />
          <rect className="ta-label" x="22" y="4" width={70 - i * 12} height="6" rx="3" />
        </g>
      ))}
    </>
  );
}

/** Filas de la tabla que se reordenan. */
export function AnimTable() {
  return svg(
    <>
      <rect className="ta-head" x="14" y="4" width="132" height="12" rx="2" />
      <text className="ta-text" x="132" y="13" textAnchor="end">↓</text>
      <g className="ta-row ta-r1"><rect className="ta-rowbg" x="14" y="20" width="132" height="14" rx="2" /><circle className="ta-dot-red" cx="118" cy="27" r="3" /></g>
      <g className="ta-row ta-r2"><rect className="ta-rowbg" x="14" y="37" width="132" height="14" rx="2" /><circle className="ta-dot-yel" cx="118" cy="44" r="3" /></g>
      <g className="ta-row ta-r3"><rect className="ta-rowbg" x="14" y="54" width="132" height="14" rx="2" /><circle className="ta-dot-grn" cx="118" cy="61" r="3" /></g>
    </>
  );
}

/** Clic en una fila y la ficha se desliza; el pin se fija. */
export function AnimFicha() {
  return svg(
    <>
      <rect className="ta-rowbg" x="8" y="14" width="64" height="12" rx="2" />
      <rect className="ta-rowbg" x="8" y="30" width="64" height="12" rx="2" />
      <rect className="ta-rowbg" x="8" y="46" width="64" height="12" rx="2" />
      <path className="ta-cursor" d="M0 0 L0 12 L3.5 9 L6 14 L8 13 L5.5 8 L10 8 Z" />
      <g className="ta-panel">
        <rect className="ta-card" x="84" y="6" width="70" height="60" rx="5" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect className="ta-label" x="90" y={18 + i * 11} width="22" height="4" rx="2" />
            <rect className="ta-track-sm" x="118" y={18 + i * 11} width="30" height="4" rx="2" />
            <circle className="ta-dot-acc" cx={124 + ((i * 7) % 20)} cy={20 + i * 11} r="2.4" />
          </g>
        ))}
        <text className="ta-pin" x="146" y="15" textAnchor="end">📌</text>
      </g>
    </>
  );
}

/** Mapas base que se suceden. */
export function AnimLayers() {
  return svg(
    <>
      <rect className="ta-base ta-b1" x="40" y="6" width="80" height="60" rx="6" />
      <rect className="ta-base ta-b2" x="40" y="6" width="80" height="60" rx="6" />
      <rect className="ta-base ta-b3" x="40" y="6" width="80" height="60" rx="6" />
      <path className="ta-line-static" d="M46 52 C66 40 80 46 96 30 S112 20 116 16" />
      <circle className="ta-stop" cx="66" cy="42" r="2.6" />
      <circle className="ta-stop" cx="96" cy="30" r="2.6" />
    </>
  );
}

/** Flecha de descarga que baja a la bandeja. */
export function AnimExport() {
  return svg(
    <>
      <path className="ta-arrow" d="M80 8 L80 40 M68 28 L80 40 L92 28" />
      <path className="ta-tray" d="M54 46 L54 60 L106 60 L106 46" />
      <text className="ta-text" x="80" y="71" textAnchor="middle">CSV</text>
    </>
  );
}

/** Página de metodología que se escribe y conmutador claro/oscuro. */
export function AnimMethod() {
  return svg(
    <>
      <rect className="ta-card" x="30" y="6" width="58" height="60" rx="4" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} className={`ta-label ta-write ta-w${i}`} x="38" y={16 + i * 10} width={i === 0 ? 26 : 42 - (i % 2) * 10} height="4" rx="2" />
      ))}
      <rect className="ta-toggle" x="104" y="26" width="34" height="18" rx="9" />
      <circle className="ta-knob" cx="113" cy="35" r="6" />
    </>
  );
}

/** Marca de verificación que se dibuja. */
export function AnimDone() {
  return svg(
    <>
      <circle className="ta-ring" cx="80" cy="36" r="24" />
      <path className="ta-draw ta-tick" d="M68 37 L77 46 L93 28" />
    </>
  );
}
