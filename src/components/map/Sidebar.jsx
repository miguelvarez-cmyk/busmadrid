import { useState } from 'react';
import LineSelector from './LineSelector.jsx';
import VisualizationControls from './VisualizationControls.jsx';
import LayerToggles from './LayerToggles.jsx';

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
  serviceMetrics,
  selectedRouteIds,
  visibleRouteIds,
  basemap,
  setBasemap,
  showStops,
  setShowStops,
  stopsGeojson,
}) {
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches;
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [openSections, setOpenSections] = useState(() => new Set(['lineas']));

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

  const hasViz = serviceMetrics || routeSpeed || routeDemand || routeFleet || routeTortuosity;

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">EMT Madrid</span>
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

        {hasViz && (
          <AccordionSection
            id="viz"
            title="Visualización"
            icon="⚙"
            isOpen={openSections.has('viz')}
            onToggle={toggleSection}
          >
            <VisualizationControls
              routeSpeed={routeSpeed}
              routeDemand={routeDemand}
              routeFleet={routeFleet}
              routeTortuosity={routeTortuosity}
              routesMeta={routesMeta}
              serviceMetrics={serviceMetrics}
              selectedRouteIds={selectedRouteIds}
              visibleRouteIds={visibleRouteIds}
              inSidebar
            />
          </AccordionSection>
        )}

        <AccordionSection
          id="capas"
          title="Capas"
          icon="◧"
          isOpen={openSections.has('capas')}
          onToggle={toggleSection}
        >
          <LayerToggles
            basemap={basemap}
            setBasemap={setBasemap}
            showStops={showStops}
            setShowStops={setShowStops}
            stopsGeojson={stopsGeojson}
          />
        </AccordionSection>
      </div>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Cerrar panel' : 'Abrir panel'}
      >
        {isOpen ? '‹' : '›'}
      </button>
    </div>
  );
}
