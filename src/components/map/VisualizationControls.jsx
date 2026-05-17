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
  useScheduleFilter,
  useScheduleDayType,
} from '../../store/useMapStore.js';
import {
  frequencyHistogram,
  speedHistogram,
  demandHistogram,
  fleetHistogram,
  scheduleHistogram,
  formatSpanMinutes,
} from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

const DAY_TYPES = [
  { id: 'LA', label: 'Laborable', dow: 0 },
  { id: 'SA', label: 'Sábado',    dow: 5 },
  { id: 'FE', label: 'Domingo',   dow: 6 },
];

const MODES = [
  { id: 'offer', label: 'Frecuencia' },
  { id: 'schedule', label: 'Horario de Paso' },
  { id: 'speed', label: 'Velocidad' },
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
  routeSchedule,
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
  const scheduleFilter = useScheduleFilter();
  const setScheduleFilter = useMapStore((s) => s.setScheduleFilter);
  const scheduleDayType = useScheduleDayType();
  const setScheduleDayType = useMapStore((s) => s.setScheduleDayType);

  const [collapsed, setCollapsed] = useState(
    !inSidebar && typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
  );

  const decStart = () => setHourRange(Math.max(0, startHour - 1), endHour);
  const incStart = () => setHourRange(Math.min(startHour + 1, endHour - 1), endHour);
  const decEnd   = () => setHourRange(startHour, Math.max(endHour - 1, startHour + 1));
  const incEnd   = () => setHourRange(startHour, Math.min(24, endHour + 1));

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

  const scheduleBuckets = useMemo(
    () =>
      colorMode === 'schedule' && routeSchedule && scheduleFilter
        ? scheduleHistogram(routeSchedule, selectedRouteIds, scheduleDayType, scheduleFilter)
        : [],
    [colorMode, routeSchedule, selectedRouteIds, scheduleDayType, scheduleFilter]
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
            {DAY_TYPES.map(({ id, label, dow }) => (
              <button
                key={id}
                className={dayOfWeek === dow ? 'active' : ''}
                onClick={() => setDayOfWeek(dow)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="row hours">
            <div className="hour-control">
              <span className="hour-label">Desde</span>
              <span className="hour-value">{formatHour(startHour)}</span>
              <div className="hour-btns">
                <button className="hour-btn" onClick={decStart} aria-label="Restar hora inicio">−</button>
                <button className="hour-btn" onClick={incStart} aria-label="Sumar hora inicio">+</button>
              </div>
            </div>
            <div className="hour-control">
              <span className="hour-label">Hasta</span>
              <span className="hour-value">{formatHour(endHour)}</span>
              <div className="hour-btns">
                <button className="hour-btn" onClick={decEnd} aria-label="Restar hora fin">−</button>
                <button className="hour-btn" onClick={incEnd} aria-label="Sumar hora fin">+</button>
              </div>
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

      {colorMode === 'schedule' && routeSchedule && scheduleFilter && (
        <div className="body">
          <div className="row days">
            {FLEET_DAY_TYPES.map((d) => (
              <button
                key={d.id}
                className={scheduleDayType === d.id ? 'active' : ''}
                onClick={() => setScheduleDayType(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="filter-block">
            <div className="filter-title">
              <span>Distribución de amplitud de horario</span>
              <span className="muted">
                {visibleRouteIds.size}/{selectedRouteIds.size} visibles
              </span>
            </div>
            <Histogram buckets={scheduleBuckets} />
            <RangeSlider
              min={0}
              max={Math.ceil(routeSchedule.max / 60) * 60}
              step={30}
              value={scheduleFilter}
              onChange={setScheduleFilter}
              format={(v) => formatSpanMinutes(v)}
            />
            <div className="caption muted">
              Media de (última salida − primera salida) desde cada cabecera,
              por tipo de día. Más horas = verde · Menos horas = rojo.
              Rango {formatSpanMinutes(routeSchedule.min)}–{formatSpanMinutes(routeSchedule.max)}.
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
