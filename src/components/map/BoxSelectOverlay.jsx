import { useEffect, useRef, useState } from 'react';
import { WebMercatorViewport } from '@deck.gl/core';
import { useMapStore, useBoxSelectMode } from '../../store/useMapStore.js';
import { routesInBBox, normalizeBox } from '../../utils/boxSelect.js';

export default function BoxSelectOverlay({ viewState, geojson }) {
  const enabled = useBoxSelectMode();
  const setBoxSelectMode = useMapStore((s) => s.setBoxSelectMode);
  const setRangeSelection = useMapStore((s) => s.setRangeSelection);
  const containerRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!enabled) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setBoxSelectMode(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [enabled, setBoxSelectMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [enabled]);

  if (!enabled) return null;

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const p = [e.clientX - rect.left, e.clientY - rect.top];
    setDrag({ start: p, end: p, ctrl: e.ctrlKey || e.metaKey });
  };

  const onMouseMove = (e) => {
    if (!drag) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDrag({ ...drag, end: [e.clientX - rect.left, e.clientY - rect.top] });
  };

  const onMouseUp = () => {
    if (!drag) return;
    const [x1, y1, x2, y2] = normalizeBox(drag.start, drag.end);
    const dragged = (x2 - x1) > 4 && (y2 - y1) > 4;
    if (dragged && size.w > 0 && size.h > 0) {
      const viewport = new WebMercatorViewport({
        ...viewState,
        width: size.w,
        height: size.h,
      });
      const [minLng, maxLat] = viewport.unproject([x1, y1]);
      const [maxLng, minLat] = viewport.unproject([x2, y2]);
      const ids = routesInBBox(geojson, [
        Math.min(minLng, maxLng),
        Math.min(minLat, maxLat),
        Math.max(minLng, maxLng),
        Math.max(minLat, maxLat),
      ]);
      setRangeSelection([...ids], !drag.ctrl);
    }
    setDrag(null);
  };

  const rect = drag
    ? (() => {
        const [x1, y1, x2, y2] = normalizeBox(drag.start, drag.end);
        return {
          left: x1,
          top: y1,
          width: x2 - x1,
          height: y2 - y1,
          deselect: drag.ctrl,
        };
      })()
    : null;

  return (
    <div
      ref={containerRef}
      className="box-select-overlay"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {rect && (
        <div
          className={`box-select-rect ${rect.deselect ? 'deselect' : 'select'}`}
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}
      <div className="box-select-hint">
        Arrastra un recuadro para <b>añadir</b> líneas · mantén <kbd>Ctrl</kbd> para
        <b> quitar</b> · <kbd>Esc</kbd> para salir
      </div>
    </div>
  );
}
