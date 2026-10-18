import { useFichaOpen, usePanelWide } from '../store/useMapStore.js';
import { useNetwork } from '../utils/network.js';
import LinesTable from './LinesTable.jsx';
import Ficha from './Ficha.jsx';

export default function RightPanel({ mobileOpen }) {
  const { fichaIds } = useNetwork();
  const fichaOpen = useFichaOpen();
  const wide = usePanelWide();
  const showFicha = fichaOpen && fichaIds.length > 0;
  // El ancho lo marca el contenido; "ancho" solo muestra los nombres de línea
  return (
    <aside className={`panel ${wide && !showFicha ? 'panel--wide' : ''} ${mobileOpen ? 'panel--mobile-open' : ''}`}>
      {showFicha ? <Ficha /> : <LinesTable />}
    </aside>
  );
}
