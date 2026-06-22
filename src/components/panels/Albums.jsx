import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { ratingColor } from '../../utils/chartDefaults';

export default function Albums({ data }) {
  if (!data) return null;
  const albums = data.albums || [];

  if (!albums.length) {
    return (
      <Panel id="albums-panel" span={12}>
        <PanelHeader title="Albums" note="Full albums you've rated as a whole" />
        <div className="empty-state">No albums rated yet.</div>
      </Panel>
    );
  }

  const sorted = [...albums].sort((a, b) => b.rating - a.rating);

  return (
    <Panel id="albums-panel" span={12}>
      <PanelHeader title="Albums" note="Full albums you've rated as a whole" />
      <div className="album-grid">
        {sorted.map((a, i) => (
          <div className="album-card" key={i}>
            <div className="album-card-header">
              <div>
                <div className="album-card-title">{a.title}</div>
                <div className="album-card-artist">{a.artist}</div>
              </div>
              <span className="album-card-rating" style={{ color: ratingColor(a.rating) }}>
                {a.rating}/10
              </span>
            </div>
            <div className="album-card-meta">
              {a.era && <span>{a.era}</span>}
              {a.year && <span>{a.year}</span>}
              {a.label && <span>{a.label}</span>}
              <span>{a.liked ? '👍 Liked' : '👎 Not liked'}</span>
              <span>Replay: {a.replayability}/10</span>
            </div>
            {a.notes && (
              <div className="album-card-notes">"{a.notes}"</div>
            )}
            {(a.notable_qualities || []).length > 0 && (
              <div className="album-card-qualities">
                {a.notable_qualities.map((q, qi) => (
                  <span key={qi}>{q}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
