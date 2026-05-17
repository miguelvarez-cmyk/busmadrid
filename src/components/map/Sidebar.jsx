import { useState, useEffect, useRef, useCallback } from 'react';
import { useMapStore } from '../../store/useMapStore.js';
import { useMediaQuery } from '../../utils/useMediaQuery.js';
import LineSelector from './LineSelector.jsx';
import VisualizationControls from './VisualizationControls.jsx';
import LayerToggles from './LayerToggles.jsx';
import StopRoutesPanel from './StopRoutesPanel.jsx';
import DistrictsPanel from './DistrictsPanel.jsx';
import StopExpeditionsPanel from './StopExpeditionsPanel.jsx';
import OtrosPanel from './OtrosPanel.jsx';
import ItinerariosPanel from './ItinerariosPanel.jsx';
import CoveragePanel from './CoveragePanel.jsx';
import MetroCercaniasPanel from './MetroCercaniasPanel.jsx';

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
  routeDivergence,
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
  buildingLineCoverage,
  buildingCoverageLoading,
  metroCercaniasRoutes,
  metroCercaniasStops,
  isLoading,
  onReset,
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


  const sidebarRef = useRef(null);
  const dragRef = useRef({ startY: 0, startHeight: 0, dragging: false });

  const handleTouchStart = useCallback((e) => {
    if (window.innerWidth > 720) return;
    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.startHeight = sidebarRef.current?.offsetHeight ?? 0;
    dragRef.current.dragging = true;
    if (sidebarRef.current) sidebarRef.current.style.transition = 'none';
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!dragRef.current.dragging || window.innerWidth > 720) return;
    const delta = dragRef.current.startY - e.touches[0].clientY;
    const newH = Math.min(
      Math.max(dragRef.current.startHeight + delta, 80),
      window.innerHeight * 0.88
    );
    if (sidebarRef.current) sidebarRef.current.style.height = newH + 'px';
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragRef.current.dragging = false;
    const el = sidebarRef.current;
    if (!el || window.innerWidth > 720) return;
    el.style.transition = '';
    const h = el.offsetHeight;
    const vh = window.innerHeight;
    if (h < vh * 0.2)       el.style.height = '80px';
    else if (h < vh * 0.65) el.style.height = '45vh';
    else                    el.style.height = '85vh';
  }, []);

  const hasViz = serviceMetrics || routeSpeed || routeSchedule;

  useEffect(() => {
    if (window.innerWidth > 720) return;
    const el = sidebarRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, false);
    el.addEventListener('touchmove', handleTouchMove, false);
    el.addEventListener('touchend', handleTouchEnd, false);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart, false);
      el.removeEventListener('touchmove', handleTouchMove, false);
      el.removeEventListener('touchend', handleTouchEnd, false);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <>
      <div ref={sidebarRef} className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sheet-handle" />
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-title-btn"
            onClick={onReset}
            title="Volver al inicio"
          >
            Visualizador Bus Madrid
            <span
              className={`sidebar-status-dot ${isLoading ? 'loading' : 'ready'}`}
              aria-label={isLoading ? 'Cargando datos' : 'Datos cargados'}
              title={isLoading ? 'Cargando datos…' : 'Datos listos'}
            />
          </button>
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
            icon="🔎"
            isOpen={openSections.has('lineas')}
            onToggle={toggleSection}
          >
            {routesMeta && <LineSelector routesMeta={routesMeta} inSidebar />}
          </AccordionSection>

          <AccordionSection
            id="barrios"
            title="Barrios"
            icon="🏙️"
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
              icon="🕑"
              isOpen={openSections.has('calidad')}
              onToggle={toggleSection}
            >
              <VisualizationControls
                routeSpeed={routeSpeed}
                routeSchedule={routeSchedule}
                routesMeta={routesMeta}
                serviceMetrics={serviceMetrics}
                selectedRouteIds={selectedRouteIds}
                visibleRouteIds={visibleRouteIds}
                inSidebar
              />
            </AccordionSection>
          )}

          {(routeTortuosity || routeDivergence) && (
            <AccordionSection
              id="itinerarios"
              title="Análisis de itinerarios"
              icon="🔃"
              isOpen={openSections.has('itinerarios')}
              onToggle={toggleSection}
            >
              <ItinerariosPanel
                routeTortuosity={routeTortuosity}
                routeDivergence={routeDivergence}
                selectedRouteIds={selectedRouteIds}
                visibleRouteIds={visibleRouteIds}
              />
            </AccordionSection>
          )}

          <AccordionSection
            id="paradas"
            title="Paradas"
            icon="🚏"
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
            icon="⭐"
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
            id="cobertura"
            title="Población"
            icon="👨‍👩‍👧‍👦"
            isOpen={openSections.has('cobertura')}
            onToggle={toggleSection}
          >
            <CoveragePanel
              routeCoverage={routeCoverage}
              routesMeta={routesMeta}
              buildingLineCoverage={buildingLineCoverage}
              buildingCoverageLoading={buildingCoverageLoading}
            />
          </AccordionSection>

          <AccordionSection
            id="metro"
            title="Metro"
            icon="🚇"
            isOpen={openSections.has('metro')}
            onToggle={toggleSection}
          >
            <MetroCercaniasPanel
              metroCercaniasRoutes={metroCercaniasRoutes}
              metroCercaniasStops={metroCercaniasStops}
            />
          </AccordionSection>

          <AccordionSection
            id="fondo"
            title="Fondo"
            icon="🗺️"
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
          aria-label="Abrir panel de líneas"
        >
          ☰
        </button>
      )}
    </>
  );
}
