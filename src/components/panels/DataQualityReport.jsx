import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

export default function DataQualityReport({ data }) {
  const stats = useMemo(() => {
    if (!data?.predictions) return null;

    const total = data.predictions.length;
    const withAudio = data.predictions.filter(p => p.acousticness !== undefined && p.acousticness !== null).length;
    const withMoodZone = data.predictions.filter(p => p.mood_zone).length;
    const withEra = data.predictions.filter(p => p.era && p.era !== 'Unknown').length;
    const liked = data.predictions.filter(p => p.liked).length;
    const withReplayability = data.predictions.filter(p => p.replayability !== undefined && p.replayability !== null).length;

    return {
      total,
      audioFeatures: { count: withAudio, pct: ((withAudio / total) * 100).toFixed(0) },
      moodZone: { count: withMoodZone, pct: ((withMoodZone / total) * 100).toFixed(0) },
      era: { count: withEra, pct: ((withEra / total) * 100).toFixed(0) },
      liked: { count: liked, pct: ((liked / total) * 100).toFixed(0) },
      replayability: { count: withReplayability, pct: ((withReplayability / total) * 100).toFixed(0) },
    };
  }, [data]);

  if (!stats) return null;

  const qualityIndicator = (pct) => {
    const p = parseInt(pct);
    if (p >= 95) return '🟢';
    if (p >= 80) return '🟡';
    return '🔴';
  };

  return (
    <Panel id="data-quality-panel" span={6}>
      <PanelHeader title="Data Quality & Coverage" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
        {[
          { label: 'Audio Features', ...stats.audioFeatures },
          { label: 'Mood Zones', ...stats.moodZone },
          { label: 'Era Info', ...stats.era },
          { label: 'Liked Flag', ...stats.liked },
          { label: 'Replayability', ...stats.replayability },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '0.6rem',
            backgroundColor: 'rgba(93,155,224,0.05)',
            borderRadius: '0.3rem',
            borderLeft: `3px solid ${parseInt(item.pct) >= 95 ? '#50c878' : parseInt(item.pct) >= 80 ? '#ffc832' : '#ff6b6b'}`,
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
              {qualityIndicator(item.pct)} {item.label}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: parseInt(item.pct) >= 95 ? '#50c878' : parseInt(item.pct) >= 80 ? '#ffc832' : '#ff6b6b' }}>
              {item.pct}%
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
              {item.count} / {stats.total}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-faint)', fontSize: '0.75rem', color: 'var(--muted)' }}>
        <strong>New Features:</strong> v6.00 added 45 features including ballad splits, artist×era ratings, label×decade interactions, confidence metrics, and missingness indicators. These features were trained with Leave-One-Out cross-validation to prevent data leakage.
      </div>
    </Panel>
  );
}
