import { useState, useEffect, useRef, useMemo } from 'react';
import { useSetViewState } from '../../store/useMapStore.js';

const MADRID_VIEWBOX = '-3.88,40.32,-3.53,40.55';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export default function SearchBar({ stopsGeojson }) {
  const setViewState = useSetViewState();
  const [query, setQuery] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const nominatimTimerRef = useRef(null);

  const stopResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || !stopsGeojson) return [];
    return stopsGeojson.features
      .filter((f) => {
        const name = (f.properties.stop_name ?? '').toLowerCase();
        const code = (f.properties.stop_code ?? '').toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 5)
      .map((f) => ({
        type: 'stop',
        label: f.properties.stop_name,
        sub: `Parada ${f.properties.stop_code}`,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      }));
  }, [query, stopsGeojson]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setAddressResults([]);
      return;
    }
    clearTimeout(nominatimTimerRef.current);
    nominatimTimerRef.current = setTimeout(async () => {
      try {
        const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=3&viewbox=${MADRID_VIEWBOX}&bounded=1&accept-language=es`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return;
        const data = await res.json();
        setAddressResults(data.map((item) => ({
          type: 'address',
          label: item.display_name.split(',').slice(0, 2).join(','),
          sub: item.type,
          lon: +item.lon,
          lat: +item.lat,
        })));
      } catch {
        setAddressResults([]);
      }
    }, 400);
    return () => clearTimeout(nominatimTimerRef.current);
  }, [query]);

  const results = [...stopResults, ...addressResults];

  useEffect(() => {
    setIsOpen(query.trim().length >= 2);
  }, [query, results.length]);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selectResult(result) {
    setViewState({
      longitude: result.lon,
      latitude: result.lat,
      zoom: result.type === 'stop' ? 16 : 14,
      pitch: 0,
      bearing: 0,
      transitionDuration: 800,
    });
    setQuery('');
    setIsOpen(false);
    setAddressResults([]);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  }

  return (
    <div className="search-bar" ref={containerRef}>
      <div className="sb-input-wrap">
        <span className="sb-icon">🔍</span>
        <input
          type="text"
          className="sb-input"
          placeholder="Buscar parada o dirección…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className="sb-clear" onClick={() => { setQuery(''); setIsOpen(false); }}>×</button>
        )}
      </div>
      {isOpen && (
        <ul className="sb-dropdown">
          {results.map((r, i) => (
            <li key={i} className="sb-result" onMouseDown={() => selectResult(r)}>
              <span className="sb-result-icon">{r.type === 'stop' ? '🚏' : '📍'}</span>
              <span className="sb-result-text">
                <span className="sb-result-label">{r.label}</span>
                <span className="sb-result-sub">{r.sub}</span>
              </span>
            </li>
          ))}
          {results.length === 0 && (
            <li className="sb-result sb-empty">
              <span className="sb-result-icon">○</span>
              <span className="sb-result-text">
                <span className="sb-result-label">Sin resultados para &ldquo;{query}&rdquo;</span>
                <span className="sb-result-sub">Prueba con el número de línea o el nombre de la parada</span>
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
