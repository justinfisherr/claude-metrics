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

  const albumInsight = (() => {
    if (!sorted.length) return null;
    const count = sorted.length;
    const topAlbum = sorted[0];
    const avgRating = (sorted.reduce((s, a) => s + a.rating, 0) / count).toFixed(1);
    const likedCount = sorted.filter(a => a.liked).length;
    const likedPct = Math.round((likedCount / count) * 100);
    return { count, topAlbum, avgRating, likedPct };
  })();

  return (
    <Panel id="albums-panel" span={12}>
      <PanelHeader title="Albums" note="Full albums you've rated as a whole" />
      {albumInsight && (
        <p className="panel-insight">
          {albumInsight.count} album{albumInsight.count !== 1 ? 's' : ''} rated. Your favorite is{' '}
          <strong>{albumInsight.topAlbum.title}</strong> by {albumInsight.topAlbum.artist} ({albumInsight.topAlbum.rating}/10).{' '}
          {albumInsight.likedPct >= 70
            ? 'Most of these albums earned playlist-worthy status — you tend to rate full records you already connect with.'
            : 'You\'re selective about which full albums earn your endorsement, even among ones you rate well.'}
        </p>
      )}
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
