import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

export default function FeatureConfidenceMetrics({ data }) {
  const stats = useMemo(() => {
    if (!data?.predictions) return null;

    const artists = {};
    data.predictions.forEach(p => {
      if (!artists[p.artist]) artists[p.artist] = [];
      artists[p.artist].push(p.actual);
    });

    const artistCounts = Object.entries(artists)
      .map(([artist, ratings]) => ({
        artist,
        count: ratings.length,
        mean: (ratings.reduce((a, b) => a + b) / ratings.length).toFixed(2),
        confidence: (ratings.length / (ratings.length + 15)).toFixed(3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return {
      artistCounts,
      reliableArtists: artistCounts.filter(a => a.count >= 15).length,
      novelArtists: data.predictions.filter(p => p.artist_is_new === 1).length,
      avgTracksPerArtist: (data.predictions.length / Object.keys(artists).length).toFixed(1),
      totalArtists: Object.keys(artists).length,
    };
  }, [data]);

  if (!stats) return null;

  return (
    <Panel id="feature-confidence-panel" span={6}>
      <PanelHeader title="Feature Confidence Metrics" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            High-Confidence Artists
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#50c878', marginTop: '0.3rem' }}>
            {stats.reliableArtists}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
            ≥15 tracks (k=15 Bayesian constant)
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            New Artists
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc832', marginTop: '0.3rem' }}>
            {stats.novelArtists}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
            First-time appearances (low confidence)
          </div>
        </div>
      </div>

      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-faint)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.6rem' }}>
          Top Artists by Track Count & Confidence
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.6rem' }}>
          {stats.artistCounts.slice(0, 8).map((a, i) => (
            <div key={i} style={{
              padding: '0.6rem',
              backgroundColor: 'rgba(93,155,224,0.05)',
              borderRadius: '0.3rem',
              borderLeft: `3px solid ${parseFloat(a.confidence) > 0.8 ? '#50c878' : parseFloat(a.confidence) > 0.5 ? '#ffc832' : '#ff6b6b'}`,
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{a.artist}</div>
              <div style={{ fontSize: '0.8rem', color: '#50c878', fontWeight: 'bold' }}>{a.count}T</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>conf: {a.confidence}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>⌀ {a.mean}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
