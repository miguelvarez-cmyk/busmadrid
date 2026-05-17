import { useMemo } from 'react';
import {
  useMapStore,
  useColorMode,
  useTortuosityFilter,
  useDivergenceFilter,
} from '../../store/useMapStore.js';
import { tortuosityHistogram, divergenceHistogram } from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

export default function ItinerariosPanel({
  routeTortuosity,
  routeDivergence,
  selectedRouteIds,
  visibleRouteIds,
}) {
  const colorMode = useColorMode();
  const setColorMode = useMapStore((s) => s.setColorMode);

  const tortuosityFilter = useTortuosityFilter();
  const setTortuosityFilter = useMapStore((s) => s.setTortuosityFilter);

  const divergenceFilter = useDivergenceFilter();
  const setDivergenceFilter = useMapStore((s) => s.setDivergenceFilter);

  const tortuosityBuckets = useMemo(
    () =>
      colorMode === 'tortuosity' && routeTortuosity && tortuosityFilter
        ? tortuosityHistogram(routeTortuosity, selectedRouteIds, tortuosityFilter)
        : [],
    [colorMode, routeTortuosity, selectedRouteIds, tortuosityFilter]
  );

  const divergenceBuckets = useMemo(
    () =>
      colorMode === 'divergence' && routeDivergence && divergenceFilter
        ? divergenceHistogram(routeDivergence, selectedRouteIds, divergenceFilter)
        : [],
    [colorMode, routeDivergence, selectedRouteIds, divergenceFilter]
  );

  return (
    <>
      <div className="modes" role="radiogroup">
        {routeTortuosity && (
          <button
            role="radio"
            aria-checked={colorMode === 'tortuosity'}
            className={colorMode === 'tortuosity' ? 'active' : ''}
            onClick={() => setColorMode('tortuosity')}
          >
            Tortuosidad
          </button>
        )}
        {routeDivergence && (
          <button
            role="radio"
            aria-checked={colorMode === 'divergence'}
            className={colorMode === 'divergence' ? 'active' : ''}
            onClick={() => setColorMode('divergence')}
          >
            Divergencia ida/vuelta
          </button>
        )}
      </div>

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

      {colorMode === 'divergence' && routeDivergence && divergenceFilter && (
        <div className="body">
          <div className="filter-block">
            <div className="filter-title">
              <span>Distribución de divergencia</span>
              <span className="muted">
                {visibleRouteIds.size}/{selectedRouteIds.size} visibles
              </span>
            </div>
            <Histogram buckets={divergenceBuckets} />
            <RangeSlider
              min={0}
              max={100}
              step={1}
              value={divergenceFilter}
              onChange={setDivergenceFilter}
              format={(v) => `${v}%`}
            />
            <div className="caption muted">
              % del trayecto total que solo recorre uno de los sentidos (ida
              o vuelta). 0% = mismo vial en ambos sentidos ·
              100% = recorridos completamente distintos.
              Rango {routeDivergence.min}–{routeDivergence.max}%.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
