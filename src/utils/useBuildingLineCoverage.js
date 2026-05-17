import { useEffect, useRef, useState } from 'react';

export function useBuildingLineCoverage(active) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (!active || fetched.current) return;
    fetched.current = true;
    setLoading(true);
    fetch('/data/buildings_line_coverage.geojson')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [active]);

  return { data, loading };
}
