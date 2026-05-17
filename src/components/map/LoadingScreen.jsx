import { useEffect, useRef, useState } from 'react';

const TIPS = [
  'Explora las 200 líneas de autobús de la EMT de Madrid',
  'Visualiza la velocidad media y frecuencia de cada línea',
  'Filtra rutas por hora del día o día de la semana',
  'Analiza la tortuosidad e itinerario de cada recorrido',
  'Descubre qué barrios tienen mejor cobertura de transporte',
  'Compara la flota asignada y demanda estimada por línea',
  'Integra capas del Metro de Madrid con el bus urbano',
  'Selecciona zonas del mapa para comparar líneas cercanas',
  'Visualiza la cobertura peatonal alrededor de cada parada',
  'Datos abiertos del feed GTFS oficial de la EMT Madrid',
];

function BusSVG() {
  return (
    <svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="loading-bus-svg">
      {/* carrocería */}
      <rect x="2" y="4" width="56" height="24" rx="5" fill="var(--accent)" />
      {/* techo */}
      <rect x="6" y="2" width="48" height="6" rx="3" fill="var(--accent-hover)" />
      {/* ventanas */}
      <rect x="8" y="8" width="10" height="8" rx="2" fill="var(--bg-app)" opacity="0.7" />
      <rect x="22" y="8" width="10" height="8" rx="2" fill="var(--bg-app)" opacity="0.7" />
      <rect x="36" y="8" width="10" height="8" rx="2" fill="var(--bg-app)" opacity="0.7" />
      {/* puerta */}
      <rect x="48" y="10" width="7" height="12" rx="2" fill="var(--bg-app)" opacity="0.5" />
      {/* franja lateral */}
      <rect x="2" y="19" width="56" height="3" rx="0" fill="var(--accent-hover)" opacity="0.4" />
      {/* ruedas */}
      <circle cx="14" cy="30" r="6" fill="var(--bg-surface-3)" />
      <circle cx="14" cy="30" r="3" fill="var(--bg-surface-2)" />
      <circle cx="46" cy="30" r="6" fill="var(--bg-surface-3)" />
      <circle cx="46" cy="30" r="3" fill="var(--bg-surface-2)" />
      {/* faro delantero */}
      <rect x="56" y="12" width="4" height="6" rx="2" fill="#ffe066" opacity="0.9" />
    </svg>
  );
}

export function LoadingScreen({ loading, progress }) {
  const [exiting, setExiting] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const intervalRef = useRef(null);

  // rotar tips cada 2.5 s con fade
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex((i) => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(intervalRef.current);
  }, []);

  // disparar fade-out cuando loading termina
  useEffect(() => {
    if (!loading) {
      setExiting(true);
    }
  }, [loading]);

  const clampedProgress = Math.min(100, Math.max(0, progress));
  // el bus ocupa ~64px de ancho; dejamos margen para que no salga del track
  const busOffset = clampedProgress;

  return (
    <div className={`loading-screen${exiting ? ' loading-screen--exit' : ''}`}>
      <div className="loading-inner">
        {/* cabecera */}
        <div className="loading-header">
          <div className="loading-logo">
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <rect x="2" y="5" width="20" height="14" rx="3" fill="var(--accent)" />
              <rect x="5" y="8" width="4" height="4" rx="1" fill="var(--bg-app)" opacity="0.8" />
              <rect x="10" y="8" width="4" height="4" rx="1" fill="var(--bg-app)" opacity="0.8" />
              <circle cx="7" cy="18" r="2.5" fill="var(--bg-surface-3)" />
              <circle cx="17" cy="18" r="2.5" fill="var(--bg-surface-3)" />
            </svg>
          </div>
          <h1 className="loading-title">Visualizador Bus Madrid</h1>
          <p className="loading-subtitle">Red EMT · Metro · Datos GTFS oficiales</p>
        </div>

        {/* animación del bus */}
        <div className="loading-road-container">
          <div className="loading-road" />
          <div
            className="loading-bus-wrap"
            style={{ left: `calc(${busOffset}% - ${busOffset * 0.72}px)` }}
          >
            <BusSVG />
          </div>
        </div>

        {/* barra de progreso */}
        <div className="loading-bar-area">
          <div className="loading-bar-track">
            <div
              className="loading-bar-fill"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <span className="loading-bar-pct">{clampedProgress}%</span>
        </div>

        {/* tip rotativo */}
        <p className={`loading-tip${tipVisible ? ' loading-tip--visible' : ' loading-tip--hidden'}`}>
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}
