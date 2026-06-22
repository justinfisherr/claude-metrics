import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

function ratingBlockColor(r) {
  if (r >= 9) return 'rgba(80,200,120,0.82)';
  if (r >= 7) return 'rgba(74,158,255,0.72)';
  if (r >= 5) return 'rgba(255,193,68,0.68)';
  return 'rgba(255,107,107,0.68)';
}

export default function ArtistJourneys({ data }) {
  if (!data) return null;
  const predictions = data.predictions || [];

  const { sorted, maxDur } = useMemo(() => {
    const artists = {};
    predictions.forEach(p => {
      artists[p.artist] = artists[p.artist] || [];
      artists[p.artist].push(p);
    });

    const s = Object.entries(artists)
      .filter(([, t]) => t.length >= 3)
      .map(([name, tracks]) => ({
        name,
        tracks,
        mean: tracks.reduce((sum, t) => sum + t.actual, 0) / tracks.length,
      }))
      .sort((a, b) => b.mean - a.mean);

    const md = Math.max(...predictions.map(p => p.duration_s || 300));

    return { sorted: s, maxDur: md };
  }, [predictions]);

  if (!sorted.length) return null;

  return (
    <Panel id="artist-journeys-panel" span={12}>
      <PanelHeader title="Artist Journeys" note="Each block is a track — width = duration, color = rating" />
      <p className="panel-desc">
        Only artists with <strong>3 or more rated tracks</strong> appear here, sorted by average rating (highest first). Each <strong>block</strong> is a track: <strong>width</strong> scales with <code>audio_features.duration_s</code> relative to the longest track in the dataset (wider = longer song). <strong>Color tier</strong>: green = 9–10, blue = 7–8, yellow = 5–6, red = &lt;5. The number on the right is the artist's mean rating across all their logged tracks. Hover a block to see the title and score. Useful for spotting within-artist variance — an artist with mixed colors has a wide range; a solid-green row is a consistent favorite.
      </p>
      <div className="artist-journeys-scroll">
        {sorted.map(({ name, tracks, mean }) => (
          <div className="artist-row" key={name}>
            <div className="artist-name">{name}</div>
            <div className="artist-blocks">
              {tracks.map((t, i) => {
                const w = Math.max(18, ((t.duration_s || 300) / maxDur) * 180);
                return (
                  <div
                    key={i}
                    className="artist-block"
                    style={{ width: `${w}px`, background: ratingBlockColor(t.actual) }}
                    data-label={`${t.title} (${t.actual})`}
                  />
                );
              })}
            </div>
            <div className="artist-avg">{mean.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
