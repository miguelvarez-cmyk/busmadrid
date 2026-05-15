import { useState, useEffect } from 'react';
import { useMapStore } from '../../store/useMapStore.js';
import { useMediaQuery } from '../../utils/useMediaQuery.js';
import LineSelector from './LineSelector.jsx';
import VisualizationControls from './VisualizationControls.jsx';
import LayerToggles from './LayerToggles.jsx';
import StopRoutesPanel from './StopRoutesPanel.jsx';
import DistrictsPanel from './DistrictsPanel.jsx';
import StopExpeditionsPanel from './StopExpeditionsPanel.jsx';
import OtrosPanel from './OtrosPanel.jsx';

function AccordionSection({ id, title, icon, isOpen, onToggle, children }) {
  const [hasBeenOpened, setHasBeenOpened] = useState(isOpen);

  const handleToggle = () => {
    if (!hasBeenOpened) setHasBeenOpened(true);
    onToggle(id);
  };

  return (
    <div className="accordion-section">
      <button
        type="button"
        className={`accordion-header ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span className="accordion-icon" aria-hidden="true">{icon}</span>
        <span>{title}</span>
        <span className="accordion-arrow" aria-hidden="true">▼</span>
      </button>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        {hasBeenOpened && <div>{children}</div>}
      </div>
    </div>
  );
}

export default function Sidebar({
  routesMeta,
  routeSpeed,
  routeDemand,
  routeFleet,
  routeTortuosity,
  routeSchedule,
  routeDistricts,
  serviceMetrics,
  selectedRouteIds,
  visibleRouteIds,
  basemap,
  setBasemap,
  showStops,
  setShowStops,
  stopsGeojson,
  stopExpeditions,
  occupancyData,
}) {
  const isMobile = useMediaQuery('(max-width: 720px)');
  const [isOpen, setIsOpen] = useState(
    () => typeof window !== 'undefined' ? !window.matchMedia('(max-width: 720px)').matches : true
  );
  const [openSections, setOpenSections] = useState(() => new Set(['lineas']));

  useEffect(() => {
    if (isMobile) setIsOpen(false);
  }, [isMobile]);

  // Atajo de teclado [ para toggle del sidebar
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement;
        const isInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA';
        if (!isInput) setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const boxSelectMode = useMapStore((s) => s.boxSelectMode);
  const setBoxSelectMode = useMapStore((s) => s.setBoxSelectMode);

  const hasViz = serviceMetrics || routeSpeed || routeTortuosity || routeSchedule;

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Visualizador Bus Madrid</span>
          <button
            type="button"
            className="sidebar-hamburger"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar panel"
          >
            ✕
          </button>
        </div>

        <div className="sidebar-body">
          <AccordionSection
            id="lineas"
            title="Líneas"
            icon="≡"
            isOpen={openSections.has('lineas')}
            onToggle={toggleSection}
          >
            {routesMeta && <LineSelector routesMeta={routesMeta} inSidebar />}
          </AccordionSection>

          <AccordionSection
            id="barrios"
            title="Barrios"
            icon="◉"
            isOpen={openSections.has('barrios')}
            onToggle={toggleSection}
          >
            <div className="barrios-content">
              <button
                className={`box-toggle ${boxSelectMode ? 'on' : ''}`}
                onClick={() => setBoxSelectMode(!boxSelectMode)}
                title="Arrastra un recuadro en el mapa para añadir líneas. Mantén Ctrl para quitarlas."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: '12px',
                }}
              >
                ▭ Área
              </button>
              <DistrictsPanel routeDistricts={routeDistricts} />
            </div>
          </AccordionSection>

          {hasViz && (
            <AccordionSection
              id="calidad"
              title="Calidad de la Oferta"
              icon="⚙"
              isOpen={openSections.has('calidad')}
              onToggle={toggleSection}
            >
              <VisualizationControls
                routeSpeed={routeSpeed}
                routeTortuosity={routeTortuosity}
                routeSchedule={routeSchedule}
                routesMeta={routesMeta}
                serviceMetrics={serviceMetrics}
                selectedRouteIds={selectedRouteIds}
                visibleRouteIds={visibleRouteIds}
                inSidebar
              />
            </AccordionSection>
          )}

          <AccordionSection
            id="paradas"
            title="Paradas"
            icon="⬤"
            isOpen={openSections.has('paradas')}
            onToggle={toggleSection}
          >
            <label
              style={{ marginBottom: '12px', opacity: stopsGeojson ? 1 : 0.5 }}
              title={!stopsGeojson ? 'Cargando datos de paradas…' : undefined}
            >
              <input
                id="show-stops-checkbox"
                type="checkbox"
                checked={showStops}
                onChange={(e) => setShowStops(e.target.checked)}
                disabled={!stopsGeojson}
                aria-describedby={!stopsGeojson ? 'stops-loading-hint' : undefined}
              />
              <span>Mostrar paradas</span>
              {stopsGeojson
                ? <span className="muted"> ({stopsGeojson.features.length})</span>
                : <span id="stops-loading-hint" className="muted"> (cargando…)</span>
              }
            </label>
            <StopRoutesPanel stopsGeojson={stopsGeojson} />
            <StopExpeditionsPanel stopExpeditions={stopExpeditions} />
          </AccordionSection>

          <AccordionSection
            id="otros"
            icon="★"
            title="Otros"
            isOpen={openSections.has('otros')}
            onToggle={toggleSection}
          >
            <OtrosPanel
              routeFleet={routeFleet}
              routeDemand={routeDemand}
              occupancyData={occupancyData}
              routesMeta={routesMeta}
              selectedRouteIds={selectedRouteIds}
            />
          </AccordionSection>

          <AccordionSection
            id="fondo"
            title="Fondo"
            icon="◧"
            isOpen={openSections.has('fondo')}
            onToggle={toggleSection}
          >
            <LayerToggles
              basemap={basemap}
              setBasemap={setBasemap}
            />
          </AccordionSection>
        </div>
      </div>

      {!isOpen && (
        <button
          type="button"
          className="sidebar-open-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir panel"
        >
          ☰
        </button>
      )}
    </>
  );
}
