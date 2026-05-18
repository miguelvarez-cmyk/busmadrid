import { useMapStore, useShowBusLanes, useShowParkingBands } from '../../store/useMapStore.js';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px', paddingLeft: '22px' }}>
          <span style={{ display: 'inline-block', width: '28px', height: '4px', borderRadius: '2px', background: '#50a0dc', flexShrink: 0 }} />
          <span className="muted" style={{ fontSize: '11px' }}>Bandas en calles con bus</span>
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
