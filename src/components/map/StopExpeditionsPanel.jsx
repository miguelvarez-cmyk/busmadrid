import { useMemo } from 'react';
import { useMapStore, useStopColorMode, useStopExpeditionsFilter } from '../../store/useMapStore.js';
import { stopRoutesHistogram } from '../../utils/service.js';
import Histogram from './Histogram.jsx';
import RangeSlider from './RangeSlider.jsx';

export default function StopExpeditionsPanel({ stopExpeditions }) {
  const stopColorMode = useStopColorMode();
  const setStopColorMode = useMapStore((s) => s.setStopColorMode);
  const stopExpeditionsFilter = useStopExpeditionsFilter();
  const setStopExpeditionsFilter = useMapStore((s) => s.setStopExpeditionsFilter);

  const maxPeak = useMemo(() => {
    if (!stopExpeditions?.byStop) return 100;
    const peaks = Object.values(stopExpeditions.byStop).map((s) => s.peak);
    return peaks.length > 0 ? Math.max(...peaks) : 100;
  }, [stopExpeditions]);

  const totalStops = useMemo(() => {
    return stopExpeditions?.byStop ? Object.keys(stopExpeditions.byStop).length : 0;
  }, [stopExpeditions]);

  const buckets = useMemo(() => {
    if (!stopExpeditions?.byStop || !stopExpeditionsFilter) return [];
    const peaks = Object.values(stopExpeditions.byStop).map((s) => s.peak);
    const binWidth = Math.max(1, Math.ceil(maxPeak / 20));
    const nBins = Math.ceil(maxPeak / binWidth) + 1;
    const counts = new Array(nBins).fill(0);
    for (const peak of peaks) {
      const i = Math.min(Math.floor(peak / binWidth), nBins - 1);
      counts[i]++;
    }
    const [fMin, fMax] = stopExpeditionsFilter;
    return counts.map((count, i) => {
      const binLo = i * binWidth;
      const binHi = binLo + binWidth;
      const t = maxPeak > 0 ? Math.min(binLo / maxPeak, 1) : 0;
      let color;
      if (t < 0.5) {
        const k = t / 0.5;
        color = [
          Math.round(220),
          Math.round(60 + 180 * k),
          50,
        ];
      } else {
        const k = (t - 0.5) / 0.5;
        color = [
          Math.round(220 - 180 * k),
          Math.round(240 - 90 * k),
          Math.round(50 + 30 * k),
        ];
      }
      return {
        label: `${binLo}–${binHi}`,
        count,
        color,
        inRange: binLo <= fMax && binHi > fMin,
      };
    });
  }, [stopExpeditions, stopExpeditionsFilter, maxPeak]);

  const isActive = stopColorMode === 'expeditions';

  if (!stopExpeditions?.byStop || !stopExpeditionsFilter) return null;

  return (
    <div className="controls">
      <button
        className={`toggle-button ${isActive ? 'active' : ''}`}
        onClick={() => setStopColorMode('expeditions')}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: isActive ? '#1a1a1a' : '#f9fafb',
          color: isActive ? '#fff' : '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 500,
          marginBottom: '8px',
        }}
      >
        {isActive ? '✓ Expediciones hora punta' : 'Expediciones hora punta'}
      </button>

      {isActive && (
        <div className="filter-block">
          <div className="filter-title">
            <span>Nº expediciones en hora punta</span>
            <span className="muted">{totalStops} paradas</span>
          </div>
          <Histogram buckets={buckets} />
          <RangeSlider
            min={0}
            max={maxPeak}
            step={1}
            value={stopExpeditionsFilter}
            onChange={setStopExpeditionsFilter}
            format={(v) => `${v} exp`}
          />
          <div className="caption muted">
            Pico de expediciones en la hora con más servicios (lunes típico).
          </div>
        </div>
      )}
    </div>
  );
}
