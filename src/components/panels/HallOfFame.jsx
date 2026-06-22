import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

export default function HallOfFame({ data }) {
  if (!data) return null;
  const predictions = data?.predictions || [];

  const top = predictions
    .filter(p => p.actual >= 9)
    .sort((a, b) => b.actual - a.actual || a.title.localeCompare(b.title))
    .slice(0, 20);

  return (
    <Panel id="hof-panel" span={12}>
      <PanelHeader title="Hall of Fame" note="Your 9s and 10s — the tracks that define your taste" />
      <p className="panel-desc">
        Your top 20 tracks rated <strong>9 or 10 out of 10</strong>, displayed as cards sorted by score. These are your taste anchors — the tracks the recommendation model uses as its north star. Moods shown are the tags logged at rating time. Era and year give a sense of where in jazz history your absolute favorites live.
      </p>
      {!top.length ? (
        <div className="empty-state">No tracks rated 9+ yet.</div>
      ) : (
        <div className="hof-grid">
          {top.map((t, i) => (
            <div key={i} className={`hof-card${t.actual === 10 ? ' perfect' : ''}`}>
              <div className="hof-rating">{t.actual}/10</div>
              <div className="hof-title">{t.title}</div>
              <div className="hof-artist">{t.artist}</div>
              <div className="hof-meta">
                {t.era || ''}{t.year ? ` · ${t.year}` : ''}
              </div>
              <div className="hof-tags">
                {(t.moods || []).slice(0, 4).map((m, j) => (
                  <span key={j} className="hof-tag">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
