import { useMemo } from 'react';
import Card from '../shared/Card';

export default function ArtistEraPerformance({ data }) {
  if (!data?.predictions) return null;

  const artistEraMetrics = useMemo(() => {
    const metrics = {};

    data.predictions.forEach(p => {
      const artist = p.artist;
      const era = p.era || 'Unknown';
      const key = `${artist}|${era}`;

      if (!metrics[key]) {
        metrics[key] = { artist, era, ratings: [] };
      }
      metrics[key].ratings.push(p.actual);
    });

    // Calculate stats per artist-era combo
    const results = Object.values(metrics)
      .filter(m => m.ratings.length >= 2)
      .map(m => ({
        ...m,
        mean: (m.ratings.reduce((a, b) => a + b) / m.ratings.length).toFixed(2),
        count: m.ratings.length,
      }))
      .sort((a, b) => b.mean - a.mean)
      .slice(0, 15);

    return results;
  }, [data]);

  return (
    <Card title="Artist × Era Performance" span="span-6">
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
        Top 15 artist-era combinations by mean rating (2+ tracks)
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ fontSize: '0.8rem', width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Artist</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Era</th>
              <th style={{ textAlign: 'center', padding: '0.4rem' }}>Tracks</th>
              <th style={{ textAlign: 'center', padding: '0.4rem' }}>Mean Rating</th>
            </tr>
          </thead>
          <tbody>
            {artistEraMetrics.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                <td style={{ padding: '0.4rem' }}>{m.artist}</td>
                <td style={{ padding: '0.4rem', color: 'var(--muted)' }}>{m.era}</td>
                <td style={{ textAlign: 'center', padding: '0.4rem' }}>{m.count}</td>
                <td style={{ textAlign: 'center', padding: '0.4rem', fontWeight: 'bold', color: m.mean >= 7 ? '#50c878' : m.mean >= 5 ? '#ffc832' : '#ff6b6b' }}>
                  {m.mean}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
