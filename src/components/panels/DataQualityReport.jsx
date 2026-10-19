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

  const qualityColor = (pct) => {
    const p = parseInt(pct);
    if (p >= 95) return '#50c878';
    if (p >= 80) return '#ffc832';
    return '#ff6b6b';
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
            padding: '10px 0 0',
            backgroundColor: 'transparent',
            borderRadius: 0,
            borderTop: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: qualityColor(item.pct), flex: 'none' }} aria-hidden="true" />
              {item.label}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: qualityColor(item.pct) }}>
              {item.pct}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {item.count} / {stats.total}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-faint)', fontSize: '0.75rem', color: 'var(--muted)', maxWidth: '62ch' }}>
        <strong>New Features:</strong> v6.00 added 45 features including ballad splits, artist×era ratings, label×decade interactions, confidence metrics, and missingness indicators. These features were trained with Leave-One-Out cross-validation to prevent data leakage.
      </div>
    </Panel>
  );
}
