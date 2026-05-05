import { useMemo, useState } from 'react';
import {
  useMapStore,
  useColorMode,
  useTimeFilter,
  useFreqFilter,
  useSpeedFilter,
  useDemandFilter,
  useFleetFilter,
  useFleetDayType,
  useTortuosityFilter,
} from '../../store/useMapStore.js';
import {
  frequencyHistogram,
  speedHistogram,
  demandHistogram,
  fleetHistogram,
  tortuosityHistogram,
} from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MODES = [
  { id: 'route', label: 'Color' },
  { id: 'offer', label: 'Frecuencia' },
  { id: 'speed', label: 'Velocidad' },
  { id: 'demand', label: 'Viajeros' },
  { id: 'fleet', label: 'Flota' },
  { id: 'tortuosity', label: 'Tortuosidad' },
];

const FLEET_DAY_TYPES = [
  { id: 'LA', label: 'Laborable' },
  { id: 'SA', label: 'Sábado' },
  { id: 'FE', label: 'Festivo' },
];

function formatPax(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(v);
}

function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

export default function VisualizationControls({
  routeSpeed,
  routeDemand,
  routeFleet,
  routeTortuosity,
  routesMeta,
  serviceMetrics,
  selectedRouteIds,
  visibleRouteIds,
  inSidebar = false,
}) {
  const colorMode = useColorMode();
  const setColorMode = useMapStore((s) => s.setColorMode);
  const { dayOfWeek, startHour, endHour } = useTimeFilter();
  const setDayOfWeek = useMapStore((s) => s.setDayOfWeek);
  const setHourRange = useMapStore((s) => s.setHourRange);
  const freqFilter = useFreqFilter();
  const setFreqFilter = useMapStore((s) => s.setFreqFilter);
  const speedFilter = useSpeedFilter();
  const setSpeedFilter = useMapStore((s) => s.setSpeedFilter);
  const demandFilter = useDemandFilter();
  const setDemandFilter = useMapStore((s) => s.setDemandFilter);
  const fleetFilter = useFleetFilter();
  const setFleetFilter = useMapStore((s) => s.setFleetFilter);
  const fleetDayType = useFleetDayType();
  const setFleetDayType = useMapStore((s) => s.setFleetDayType);
  const tortuosityFilter = useTortuosityFilter();
  const setTortuosityFilter = useMapStore((s) => s.setTortuosityFilter);

  const [collapsed, setCollapsed] = useState(
    !inSidebar && typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
  );

  const handleStart = (e) => {
    const v = Number(e.target.value);
    setHourRange(v, Math.max(endHour, v + 1));
  };
  const handleEnd = (e) => {
    const v = Number(e.target.value);
    setHourRange(Math.min(startHour, v - 1), v);
  };

  const freqBuckets = useMemo(
    () =>
      colorMode === 'offer' && serviceMetrics
        ? frequencyHistogram(
            serviceMetrics,
            selectedRouteIds,
            dayOfWeek,
            startHour,
            endHour,
            freqFilter
          )
        : [],
    [colorMode, serviceMetrics, selectedRouteIds, dayOfWeek, startHour, endHour, freqFilter]
  );

  const speedBuckets = useMemo(
    () =>
      colorMode === 'speed' && routeSpeed && speedFilter
        ? speedHistogram(routeSpeed, selectedRouteIds, speedFilter)
        : [],
    [colorMode, routeSpeed, selectedRouteIds, speedFilter]
  );

  // Sólo consideramos las líneas que están en el feed GTFS de 2026: hay
  // líneas con datos de viajeros 2025 que ya no existen en 2026 y se descartan.
  const demandRouteIds = useMemo(() => {
    if (!routeDemand || !routesMeta) return [];
    const inGtfs = new Set(routesMeta.map((r) => r.id));
    return Object.keys(routeDemand.byRoute).filter((id) => inGtfs.has(id));
  }, [routeDemand, routesMeta]);

  const demandStats = useMemo(() => {
    if (!routeDemand || demandRouteIds.length === 0) return null;
    const values = demandRouteIds.map((id) => routeDemand.byRoute[id].dailyAvg);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      dropped: Object.keys(routeDemand.byRoute).length - values.length,
    };
  }, [routeDemand, demandRouteIds]);

  const demandBuckets = useMemo(
    () =>
      colorMode === 'demand' && routeDemand && demandFilter
        ? demandHistogram(routeDemand, demandRouteIds, demandFilter)
        : [],
    [colorMode, routeDemand, demandRouteIds, demandFilter]
  );

  const fleetBuckets = useMemo(
    () =>
      colorMode === 'fleet' && routeFleet && fleetFilter
        ? fleetHistogram(routeFleet, selectedRouteIds, fleetDayType, fleetFilter)
        : [],
    [colorMode, routeFleet, selectedRouteIds, fleetDayType, fleetFilter]
  );

  const tortuosityBuckets = useMemo(
    () =>
      colorMode === 'tortuosity' && routeTortuosity && tortuosityFilter
        ? tortuosityHistogram(routeTortuosity, selectedRouteIds, tortuosityFilter)
        : [],
    [colorMode, routeTortuosity, selectedRouteIds, tortuosityFilter]
  );

  const content = (
    <>
      <div className="modes" role="radiogroup">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={colorMode === m.id}
            className={colorMode === m.id ? 'active' : ''}
            onClick={() => setColorMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {colorMode === 'offer' && (
        <div className="body">
          <div className="row days">
            {DAY_NAMES.map((name, i) => (
              <button
                key={i}
                className={dayOfWeek === i ? 'active' : ''}
                onClick={() => setDayOfWeek(i)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="row hours">
            <div className="hour-input">
              <label>Desde</label>
              <input type="number" min={0} max={23} value={startHour} onChange={handleStart} />
              <span>{formatHour(startHour)}</span>
            </div>
            <div className="hour-input">
              <label>Hasta</label>
              <input type="number" min={1} max={24} value={endHour} onChange={handleEnd} />
              <span>{formatHour(endHour)}</span>
            </div>
          </div>

          <div className="filter-block">
            <div className="filter-title">
              <span>Distribución de frecuencias</span>
              <span className="muted">
                {visibleRouteIds.size}/{selectedRouteIds.size} visibles
              </span>
            </div>
            <Histogram buckets={freqBuckets} />
            <RangeSlider
              min={0}
              max={60}
              step={1}
              value={freqFilter}
              onChange={setFreqFilter}
              format={(v) => (v >= 60 ? '∞' : `${v} min`)}
            />
            <div className="caption muted">
              Filtra líneas por frecuencia. ∞ incluye líneas sin servicio en el rango.
            </div>
          </div>
        </div>
      )}

      {colorMode === 'speed' && routeSpeed && speedFilter && (
        <div className="body">
          <div className="filter-block">
            <div className="filter-title">
              <span>Distribución de velocidades</span>
              <span className="muted">
                {visibleRouteIds.size}/{selectedRouteIds.size} visibles
              </span>
            </div>
            <Histogram buckets={speedBuckets} />
            <RangeSlider
              min={Math.floor(routeSpeed.min)}
              max={Math.ceil(routeSpeed.max)}
              step={1}
              value={speedFilter}
              onChange={setSpeedFilter}
              format={(v) => `${v} km/h`}
            />
            <div className="caption muted">
              Velocidad comercial = longitud media de los sentidos / duración mediana
              de los trips. Rojo = lenta, verde = rápida.
            </div>
          </div>
        </div>
      )}

      {colorMode === 'demand' && routeDemand && demandFilter && demandStats && (
        <div className="body">
          <div className="filter-block">
            <div className="filter-title">
              <span>Distribución de viajeros/día</span>
              <span className="muted">
                {visibleRouteIds.size}/{selectedRouteIds.size} visibles
              </span>
            </div>
            <Histogram buckets={demandBuckets} />
            <RangeSlider
              min={0}
              max={demandStats.max}
              step={100}
              value={demandFilter}
              onChange={setDemandFilter}
              format={(v) => `${formatPax(v)} pax`}
            />
            <div className="caption muted">
              Media de viajeros diarios en {routeDemand.year} ·
              {' '}{demandStats.count} líneas con datos · rango{' '}
              {demandStats.min.toLocaleString('es-ES')}–
              {demandStats.max.toLocaleString('es-ES')}. Escala de color
              logarítmica.
              {demandStats.dropped > 0 && (
                <>
                  {' '}<b>Nota:</b> se han descartado {demandStats.dropped} líneas
                  con datos de viajeros 2025 que ya no figuran en el GTFS 2026.
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {colorMode === 'fleet' && routeFleet && fleetFilter && (
        <div className="body">
          <div className="row days">
            {FLEET_DAY_TYPES.map((d) => (
              <button
                key={d.id}
                className={fleetDayType === d.id ? 'active' : ''}
                onClick={() => setFleetDayType(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="filter-block">
            <div className="filter-title">
              <span>Distribución de flota (buses en hora punta)</span>
              <span className="muted">
                {visibleRouteIds.size}/{selectedRouteIds.size} visibles
              </span>
            </div>
            <Histogram buckets={fleetBuckets} />
            <RangeSlider
              min={0}
              max={routeFleet.max}
              step={1}
              value={fleetFilter}
              onChange={setFleetFilter}
              format={(v) => `${v} bus`}
            />
            <div className="caption muted">
              Flota = máximo de coches en circulación a lo largo del día,
              promediado entre fechas del mismo tipo. Rojo = flota pequeña,
              verde = flota grande. El rango {routeFleet.min}–{routeFleet.max}
              {' '}cubre {Object.keys(routeFleet.byRoute).length} líneas.
            </div>
          </div>
        </div>
      )}

      {colorMode === 'tortuosity' && routeTortuosity && tortuosityFilter && (
        <div className="body">
          <div className="filter-block">
            <div className="filter-title">
              <span>Distribución de tortuosidad</span>
              <span className="muted">
                {visibleRouteIds.size}/{selectedRouteIds.size} visibles
              </span>
            </div>
            <Histogram buckets={tortuosityBuckets} />
            <RangeSlider
              min={1}
              max={Math.max(3, Math.ceil(routeTortuosity.max * 10) / 10)}
              step={0.1}
              value={tortuosityFilter}
              onChange={setTortuosityFilter}
              format={(v) => v.toFixed(2)}
            />
            <div className="caption muted">
              Tortuosidad = longitud del recorrido / distancia en línea recta
              entre los dos extremos del sentido (media de ambos sentidos).
              1.00 = línea recta · valores altos = trayecto sinuoso o circular.
              Rango {routeTortuosity.min.toFixed(2)}–
              {routeTortuosity.max.toFixed(2)}.
            </div>
          </div>
        </div>
      )}

    </>
  );

  if (inSidebar) return content;

  return (
    <div className={`viz-controls ${collapsed ? 'collapsed' : ''}`}>
      <header>
        <span>Modo de coloreado</span>
        <button
          type="button"
          className="collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expandir' : 'Colapsar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? '▸' : '▾'}
        </button>
      </header>
      {!collapsed && content}
    </div>
  );
}
