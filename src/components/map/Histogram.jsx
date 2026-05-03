/**
 * Histograma horizontal de barras: una fila por bucket con etiqueta, una barra
 * coloreada con ancho proporcional al conteo, y el conteo numérico al final.
 *
 * Props:
 *   buckets: [{ label, count, color: [r,g,b], inRange?: boolean }]
 */
export default function Histogram({ buckets }) {
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0) || 1;
  return (
    <div className="histogram">
      {buckets.map((b) => (
        <div key={b.label} className={`hist-row ${b.inRange === false ? 'dim' : ''}`}>
          <span className="hist-label">{b.label}</span>
          <div className="hist-bar-wrap">
            <div
              className="hist-bar"
              style={{
                width: `${(b.count / max) * 100}%`,
                background: `rgb(${b.color[0]},${b.color[1]},${b.color[2]})`,
              }}
            />
          </div>
          <span className="hist-count">{b.count}</span>
        </div>
      ))}
    </div>
  );
}
