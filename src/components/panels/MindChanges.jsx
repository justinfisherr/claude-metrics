import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

export default function MindChanges({ data }) {
  if (!data) return null;
  const rc = data.rating_changes;
  if (!rc || !rc.changes || !rc.changes.length) {
    return (
      <Panel id="mind-changes-panel" span={12}>
        <PanelHeader title="Mind Changes" note="Tracks and albums you've re-rated" />
        <div className="empty-state">No rating changes yet.</div>
      </Panel>
    );
  }

  const { changes, total_improvements, total_downgrades } = rc;
  const avgChange = changes.reduce((sum, c) => sum + c.change, 0) / changes.length;
  const mostChanged = [...changes].sort((a, b) => (b.times_changed || 1) - (a.times_changed || 1))[0];

  return (
    <Panel id="mind-changes-panel" span={12}>
      <PanelHeader title="Mind Changes" note="Tracks and albums you've re-rated" />

      <div className="mind-changes-stats">
        <div className="mc-stat">
          <span className="mc-stat-value">{changes.length}</span>
          <span className="mc-stat-label">Re-rated</span>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-value" style={{ color: 'var(--good)' }}>{total_improvements}</span>
          <span className="mc-stat-label">Improved</span>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-value" style={{ color: 'var(--bad)' }}>{total_downgrades}</span>
          <span className="mc-stat-label">Downgraded</span>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-value">{avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}</span>
          <span className="mc-stat-label">Avg Change</span>
        </div>
      </div>

      {mostChanged && mostChanged.times_changed > 1 && (
        <p className="panel-insight">
          <strong>{mostChanged.title}</strong> by {mostChanged.artist} has been re-rated {mostChanged.times_changed} times — the most indecisive pick so far.
        </p>
      )}

      <div className="table-scroll">
        <table className="misses-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Artist</th>
              <th>Journey</th>
              <th>Current</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c, i) => {
              const sign = c.change > 0 ? '+' : '';
              const cls = c.change > 0 ? 'improved' : 'downgraded';
              const arrow = c.change > 0 ? '▲' : '▼';
              const history = c.history || [{ rating: c.old_rating }, { rating: c.new_rating }];
              const journey = history.map(h => h.rating).join(' → ');

              return (
                <tr key={i}>
                  <td>
                    {c.title}
                    {c.is_album && <span className="mc-album-tag">album</span>}
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{c.artist}</td>
                  <td className="mc-journey">{journey}</td>
                  <td style={{ fontWeight: 800 }}>{c.new_rating}</td>
                  <td>
                    <span className={`miss-diff ${cls}`}>
                      {arrow} {sign}{c.change.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
