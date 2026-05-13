import {
  useColorMode,
  useSpeedFilter,
  useDemandFilter,
  useFleetFilter,
  useScheduleFilter,
  useOccupancyFilter,
} from '../../store/useMapStore.js';
import {
  FREQUENCY_CATEGORIES,
  TORTUOSITY_CATEGORIES,
  formatSpanMinutes,
} from '../../utils/service.js';

function fmtDemand(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1_000)}k`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(Math.round(v));
}

const GRADIENT_STYLE = 'linear-gradient(to right, rgb(50,200,50), rgb(220,200,50), rgb(220,50,50))';

const MODE_CONFIG = {
  speed:     { title: 'Velocidad media', fmt: (v) => `${v.toFixed(1)} km/h` },
  demand:    { title: 'Demanda diaria',  fmt: (v) => `${fmtDemand(v)} pax` },
  fleet:     { title: 'Flota',           fmt: (v) => `${Math.round(v)} buses` },
  schedule:  { title: 'Horario de paso', fmt: (v) => formatSpanMinutes(Math.round(v)) },
  occupancy: { title: 'Ocupación media', fmt: (v) => `${Math.round(v)} pax` },
};

function GradientLegend({ title, filter, fmt }) {
  return (
    <div className="color-legend gradient-legend">
      <div className="cl-title">{title}</div>
      <div className="cl-bar" style={{ background: GRADIENT_STYLE }} />
      <div className="cl-labels">
        <span>{fmt(filter[0])}</span>
        <span>{fmt(filter[1])}</span>
      </div>
    </div>
  );
}

function CategoricalLegend({ title, categories }) {
  return (
    <div className="color-legend categorical-legend">
      <div className="cl-title">{title}</div>
      <ul className="cl-cats">
        {categories.map((cat) => (
          <li key={cat.label}>
            <span
              className="cl-swatch"
              style={{ background: `rgb(${cat.color[0]},${cat.color[1]},${cat.color[2]})` }}
            />
            {cat.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ColorLegend() {
  const colorMode     = useColorMode();
  const speedFilter   = useSpeedFilter();
  const demandFilter  = useDemandFilter();
  const fleetFilter   = useFleetFilter();
  const scheduleFilter = useScheduleFilter();
  const occupancyFilter = useOccupancyFilter();

  if (!colorMode) return null;

  if (colorMode === 'offer') {
    return <CategoricalLegend title="Frecuencia" categories={FREQUENCY_CATEGORIES} />;
  }
  if (colorMode === 'tortuosity') {
    return <CategoricalLegend title="Tortuosidad" categories={TORTUOSITY_CATEGORIES} />;
  }

  const cfg = MODE_CONFIG[colorMode];
  if (!cfg) return null;

  const filterMap = {
    speed: speedFilter,
    demand: demandFilter,
    fleet: fleetFilter,
    schedule: scheduleFilter,
    occupancy: occupancyFilter,
  };
  const filter = filterMap[colorMode];
  if (!filter) return null;

  return <GradientLegend title={cfg.title} filter={filter} fmt={cfg.fmt} />;
}
