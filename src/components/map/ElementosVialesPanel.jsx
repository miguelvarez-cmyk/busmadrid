import { useMapStore, useShowBusLanes, useShowParkingBands } from '../../store/useMapStore.js';

const PARKING_LEGEND = [
  { color: '#0064dc', label: 'Zona Azul' },
  { color: '#1ea03c', label: 'Zona Verde' },
  { color: '#c8c800', label: 'Alta Rotación' },
  { color: '#d21e1e', label: 'Zona Roja' },
  { color: '#e68200', label: 'Zona Naranja' },
];

export default function ElementosVialesPanel({ busLanesGeojson, parkingBandsGeojson }) {
  const showBusLanes = useShowBusLanes();
  const setShowBusLanes = useMapStore((s) => s.setShowBusLanes);
  const showParkingBands = useShowParkingBands();
  const setShowParkingBands = useMapStore((s) => s.setShowParkingBands);

  const nBusLanes = busLanesGeojson?.features?.length ?? 0;
  const nParkingBands = parkingBandsGeojson?.features?.length ?? 0;
  const hasData = busLanesGeojson || parkingBandsGeojson;

  return (
    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: busLanesGeojson ? 'pointer' : 'default' }}>
        <input
          type="checkbox"
          checked={showBusLanes}
          onChange={(e) => setShowBusLanes(e.target.checked)}
          disabled={!busLanesGeojson}
        />
        <span>Carriles bus</span>
        {busLanesGeojson && (
          <span className="muted" style={{ fontSize: '11px' }}>({nBusLanes})</span>
        )}
      </label>
      {showBusLanes && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px', paddingLeft: '22px' }}>
          <span style={{ display: 'inline-block', width: '28px', height: '4px', borderRadius: '2px', background: '#e67800', flexShrink: 0 }} />
          <span className="muted" style={{ fontSize: '11px' }}>Red estructurante (SIGMA)</span>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: parkingBandsGeojson ? 'pointer' : 'default' }}>
        <input
          type="checkbox"
          checked={showParkingBands}
          onChange={(e) => setShowParkingBands(e.target.checked)}
          disabled={!parkingBandsGeojson}
        />
        <span>Aparcamiento SER</span>
        {parkingBandsGeojson && (
          <span className="muted" style={{ fontSize: '11px' }}>({nParkingBands})</span>
        )}
      </label>

      {showParkingBands && (
        <div style={{ paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p className="muted" style={{ fontSize: '11px', margin: '0 0 4px' }}>
            En calles de un carril: ambos lados. En calles de varios carriles: solo lado derecho.
          </p>
          {PARKING_LEGEND.map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <span style={{ display: 'inline-block', width: '28px', height: '4px', borderRadius: '2px', background: color, flexShrink: 0 }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {!hasData && (
        <p className="muted" style={{ fontSize: '11px', margin: 0 }}>
          Datos no disponibles. Ejecuta{' '}
          <code style={{ background: 'rgba(0,0,0,0.15)', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>
            python scripts/compute_elementos_viales.py
          </code>
        </p>
      )}
    </div>
  );
}
