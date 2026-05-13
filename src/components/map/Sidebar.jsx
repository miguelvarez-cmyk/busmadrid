import { useState } from 'react';
import { useMapStore } from '../../store/useMapStore.js';
import LineSelector from './LineSelector.jsx';
import VisualizationControls from './VisualizationControls.jsx';
import LayerToggles from './LayerToggles.jsx';
import StopRoutesPanel from './StopRoutesPanel.jsx';
import DistrictsPanel from './DistrictsPanel.jsx';
import StopExpeditionsPanel from './StopExpeditionsPanel.jsx';
import OtrosPanel from './OtrosPanel.jsx';

function AccordionSection({ id, title, icon, isOpen, onToggle, children }) {
  return (
    <div className="accordion-section">
      <button
        type="button"
        className={`accordion-header ${isOpen ? 'open' : ''}`}
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        <span className="accordion-icon">{icon}</span>
        <span>{title}</span>
        <span className="accordion-arrow">▼</span>
      </button>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        {children}
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
  routeCoverage,
}) {
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches;
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [openSections, setOpenSections] = useState(() => new Set());

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

  const hasViz = serviceMetrics || routeSpeed || routeTortuosity || routeSchedule || routeCoverage;

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
            ☰
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
                routeCoverage={routeCoverage}
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
            <label style={{ marginBottom: '12px' }}>
              <input
                type="checkbox"
                checked={showStops}
                onChange={(e) => setShowStops(e.target.checked)}
                disabled={!stopsGeojson}
              />
              <span>Mostrar paradas</span>
              {stopsGeojson && (
                <span className="muted"> ({stopsGeojson.features.length})</span>
              )}
            </label>
            <StopRoutesPanel stopsGeojson={stopsGeojson} />
            <StopExpeditionsPanel stopExpeditions={stopExpeditions} />
          </AccordionSection>

          {(routeFleet || routeDemand || occupancyData) && (
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
          )}

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
