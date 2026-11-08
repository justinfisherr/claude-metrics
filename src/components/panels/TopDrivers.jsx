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
      <div className="driver-list">
        {drivers.map((driver, idx) => {
          const isPositive = driver.direction === 'positive';
          const color = isPositive ? 'var(--good)' : 'var(--bad)';
          const sign = isPositive ? '+' : '';
          return (
            <div className="driver-row" key={idx}>
              <span className="driver-name">{driver.feature}</span>
              <span className="driver-value" style={{ color }}>
                {sign}{driver.coefficient}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
