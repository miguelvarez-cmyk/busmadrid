import { useEffect, useState } from 'react';

export function LoadingScreen({ loading, progress }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (!loading) setExiting(true);
  }, [loading]);
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className={`loading-screen${exiting ? ' loading-screen--exit' : ''}`}>
      <div className="loading-inner">
        <h1 className="loading-title">Bus Madrid</h1>
        <div className="loading-bar-track">
          <div className="loading-bar-fill" style={{ width: `${pct}%` }} />
        </div>

      </div>
    </div>
  );
}
