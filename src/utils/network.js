import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Datos de red ya calculados para el contexto activo:
 * { data, metaById, allIds, values, stats, passing, ctx }
 */
export const NetworkContext = createContext(null);
export const useNetwork = () => useContext(NetworkContext);

/** Cierra un popover al hacer clic fuera o pulsar Esc. */
export function useDismiss(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

/** Orden natural de líneas: 1, 2, 10, C1, E1, N1… */
export function compareLines(a, b) {
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
}
