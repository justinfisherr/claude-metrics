import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

export default function BiggestMisses({ data }) {
  if (!data) return null;
  const predictions = data.predictions || [];

  const sorted = useMemo(() => {
    return [...predictions]
      .sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual))
      .slice(0, 8);
  }, [predictions]);

  if (!sorted.length) {
    return (
      <Panel id="misses-panel" span={12}>
        <PanelHeader title="Biggest Misses" note="Tracks the model got most wrong" />
        <div className="empty-state">No prediction data.</div>
      </Panel>
    );
  }

  return (
    <Panel id="misses-panel" span={12}>
      <PanelHeader title="Biggest Misses" note="Tracks the model got most wrong" />
      {(() => {
        if (!sorted.length) return null;
        const top = sorted[0];
        const overPredicted = sorted.filter(p => p.residual < 0).length;
        const underPredicted = sorted.filter(p => p.residual > 0).length;
        const pattern = overPredicted > underPredicted
          ? 'The model tends to overestimate more often — your taste is pickier than the features suggest'
          : underPredicted > overPredicted
          ? 'The model tends to underestimate — you find gems in places the features don\'t fully capture'
          : 'Over- and under-predictions are balanced';
        return (
          <p className="panel-insight">
            The model's biggest blind spot is <strong>{top.title}</strong> — predicted {top.predicted} but you rated it {top.actual}. {pattern}.
          </p>
        );
      })()}
      <p className="panel-desc">
        The 8 tracks with the largest <strong>absolute residual</strong> (actual − predicted). <strong>Over-predicted</strong> <span style={{ color: 'var(--bad)' }}>&#9650;</span> means the model thought you'd rate it higher than you did — the track has the right features on paper but didn't land. <strong>Under-predicted</strong> <span style={{ color: 'var(--warning)' }}>&#9660;</span> means the model underestimated it — probably because the features don't capture why you loved it (e.g., a specific moment, a personal memory). These are your best clues for adding new features.
      </p>
      <table className="misses-table">
        <thead>
          <tr>
            <th>Track</th>
            <th>Artist</th>
            <th>Actual</th>
            <th>Predicted</th>
            <th>Diff</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const diff = p.residual;
            const sign = diff > 0 ? '+' : '';
            const cls = diff > 0 ? 'under' : 'over';
            const arrow = diff > 0 ? '▼' : '▲';
            return (
              <tr key={i}>
                <td>{p.title}</td>
                <td style={{ color: 'var(--muted)' }}>{p.artist}</td>
                <td style={{ fontWeight: 800 }}>{p.actual}</td>
                <td style={{ color: 'var(--muted)' }}>{p.predicted}</td>
                <td>
                  <span className={`miss-diff ${cls}`}>
                    {arrow} {sign}{Math.abs(diff).toFixed(1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
