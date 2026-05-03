import { useMemo } from 'react';
import {
  useMapStore,
  useColorMode,
  useTimeFilter,
  useFreqFilter,
  useSpeedFilter,
  useDemandFilter,
  useFleetFilter,
  useFleetDayType,
} from '../../store/useMapStore.js';
import {
  FREQUENCY_CATEGORIES,
  NO_SERVICE_COLOR,
  frequencyHistogram,
  speedHistogram,
  demandHistogram,
  fleetHistogram,
} from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MODES = [
  { id: 'route', label: 'Color' },
  { id: 'offer', label: 'Frecuencia' },
  { id: 'speed', label: 'Velocidad' },
  { id: 'demand', label: 'Usuarios' },
  { id: 'fleet', label: 'Flota' },
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
  serviceMetrics,
  selectedRouteIds,
  visibleRouteIds,
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

  // El histograma de demanda se calcula sobre TODAS las líneas con datos
  // (255), no sólo las que están en el catálogo GTFS (233). Algunas líneas
  // top (867, 868 con ~100k viajeros/día) no tienen shapes en el feed GTFS;
  // si limitásemos el histograma a `selectedRouteIds`, esos buckets aparecerían
  // siempre vacíos y la distribución resultaría engañosa.
  const demandBuckets = useMemo(
    () =>
      colorMode === 'demand' && routeDemand && demandFilter
        ? demandHistogram(
            routeDemand,
            Object.keys(routeDemand.byRoute),
            demandFilter
          )
        : [],
    [colorMode, routeDemand, demandFilter]
  );

  const fleetBuckets = useMemo(
    () =>
      colorMode === 'fleet' && routeFleet && fleetFilter
        ? fleetHistogram(routeFleet, selectedRouteIds, fleetDayType, fleetFilter)
        : [],
    [colorMode, routeFleet, selectedRouteIds, fleetDayType, fleetFilter]
  );

  return (
    <div className="viz-controls">
      <header>
        <span>Modo de coloreado</span>
      </header>

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

      {colorMode === 'demand' && routeDemand && demandFilter && (
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
              max={routeDemand.max}
              step={100}
              value={demandFilter}
              onChange={setDemandFilter}
              format={(v) => `${formatPax(v)} pax`}
            />
            <div className="caption muted">
              Media de viajeros diarios en {routeDemand.year} ·
              {' '}{Object.keys(routeDemand.byRoute).length} líneas con datos ·
              rango {routeDemand.min}–
              {routeDemand.max.toLocaleString('es-ES')}. Escala de color
              logarítmica.
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

      {colorMode === 'offer' && (
        <div className="body legend categorical">
          <div className="caption">Leyenda de frecuencia (mejor del rango)</div>
          <ul>
            {FREQUENCY_CATEGORIES.map((cat) => (
              <li key={cat.label}>
                <span
                  className="swatch"
                  style={{ background: `rgb(${cat.color.join(',')})` }}
                />
                <span>{cat.label}</span>
              </li>
            ))}
            <li>
              <span
                className="swatch"
                style={{ background: `rgb(${NO_SERVICE_COLOR.join(',')})` }}
              />
              <span>No opera</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
