import { useState, useEffect } from 'react';

/**
 * Suscripción reactiva a un media query.
 * @param {string} query - Media query CSS, e.g. '(max-width: 720px)'
 * @returns {boolean} true si el media query coincide actualmente
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
