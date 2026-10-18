import { useFichaOpen, usePanelWide } from '../store/useMapStore.js';
import { useNetwork } from '../utils/network.js';
import LinesTable from './LinesTable.jsx';
import Ficha from './Ficha.jsx';

export default function RightPanel({ mobileOpen }) {
  const { fichaIds } = useNetwork();
  const fichaOpen = useFichaOpen();
  const wide = usePanelWide();
  const showFicha = fichaOpen && fichaIds.length > 0;
  // La comparación necesita ancho: el panel se ensancha solo
  const isWide = wide || (showFicha && fichaIds.length > 1);
  return (
    <aside className={`panel ${isWide ? 'panel--wide' : ''} ${mobileOpen ? 'panel--mobile-open' : ''}`}>
      {showFicha ? <Ficha /> : <LinesTable />}
    </aside>
  );
}
