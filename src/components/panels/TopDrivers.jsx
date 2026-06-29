import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

export default function TopDrivers({ data }) {
  if (!data) return null;

  const drivers = (data?.top_drivers || []).slice(0, 12);
  if (!drivers.length) return null;

  return (
    <Panel id="top-drivers-panel" span={6}>
      <PanelHeader title="Top Drivers" note="Ridge regression coefficients" />
      {(() => {
        const topPositive = drivers.filter(d => d.direction === 'positive')[0];
        const topNegative = drivers.filter(d => d.direction === 'negative')[0];
        if (!topPositive || !topNegative) return null;
        return (
          <p className="panel-insight">
            <strong>{topPositive.feature}</strong> (+{topPositive.coefficient}) is your strongest booster. <strong>{topNegative.feature}</strong> ({topNegative.coefficient}) is your biggest detractor.
          </p>
        );
      })()}
      <p className="panel-desc">
        Each coefficient shows how much that feature pushes your predicted rating up (green) or down (red). These are learned from the Ridge regression model. For example, +0.42 means a unit increase in that feature adds 0.42 to your expected rating.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
        {drivers.map((driver, idx) => {
          const isPositive = driver.direction === 'positive';
          const color = isPositive ? 'rgba(80, 200, 120, 0.7)' : 'rgba(255, 107, 107, 0.7)';
          const sign = isPositive ? '+' : '';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--panel-2)',
                border: `1px solid ${color}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                {driver.feature}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color, minWidth: '60px', textAlign: 'right' }}>
                {sign}{driver.coefficient}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
