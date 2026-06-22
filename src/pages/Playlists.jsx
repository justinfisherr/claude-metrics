import { useState } from 'react';
import Navigation from '../components/shared/Navigation';
import { useDashboardData } from '../hooks/useDashboardData';
import '../styles/playlists.css';

function ratingColor(rating) {
  if (rating >= 9) return 'var(--good)';
  if (rating >= 7) return 'var(--accent)';
  if (rating >= 5) return 'var(--warning)';
  return 'var(--bad)';
}

function generateInsight(pl) {
  const parts = [];

  // Mood-based insight
  if (pl.top_moods && pl.top_moods.length) {
    const romanticMoods = ['romantic', 'tender', 'sensual', 'bittersweet', 'intimate'];
    const energyMoods = ['energetic', 'celebratory', 'communal', 'fun', 'driving'];
    const darkMoods = ['melancholic', 'tragic', 'brooding', 'dark', 'mysterious'];

    const romanticCount = pl.top_moods.filter(m => romanticMoods.includes(m.toLowerCase())).length;
    const energyCount = pl.top_moods.filter(m => energyMoods.includes(m.toLowerCase())).length;
    const darkCount = pl.top_moods.filter(m => darkMoods.includes(m.toLowerCase())).length;

    if (romanticCount >= 2) parts.push('Skews romantic and intimate');
    else if (energyCount >= 2) parts.push('High-energy and communal');
    else if (darkCount >= 2) parts.push('Moody and brooding');
    else if (pl.top_moods.length) parts.push(`Led by ${pl.top_moods.slice(0, 2).join(' and ')} moods`);
  }

  // Era-based insight
  if (pl.top_eras && pl.top_eras.length === 1) {
    parts.push(`dominated by ${pl.top_eras[0]} tracks`);
  } else if (pl.top_eras && pl.top_eras.length > 1) {
    parts.push(`spanning ${pl.top_eras.join(', ')}`);
  }

  // Replayability insight
  if (pl.avg_replayability != null) {
    if (pl.avg_replayability >= 0.85) parts.push('with very high replayability');
    else if (pl.avg_replayability >= 0.7) parts.push('with solid replayability');
  }

  // Energy insight
  if (pl.avg_energy != null) {
    if (pl.avg_energy <= 3.5) parts.push('low energy, great for winding down');
    else if (pl.avg_energy >= 7) parts.push('high energy throughout');
  }

  // Score comparison insight
  if (pl.avg_actual != null && pl.avg_predicted != null) {
    const diff = pl.avg_actual - pl.avg_predicted;
    if (diff > 0.5) parts.push('you rate this playlist higher than the model expects');
    else if (diff < -0.5) parts.push('the model thinks you should like this more than you do');
  }

  if (!parts.length) return 'A curated collection from your jazz library.';

  // Capitalize first part, join the rest
  const sentence = parts[0].charAt(0).toUpperCase() + parts[0].slice(1) +
    (parts.length > 1 ? ', ' + parts.slice(1).join(', ') : '') + '.';
  return sentence;
}

function PlaylistCard({ playlist }) {
  const [expanded, setExpanded] = useState(false);

  if (!playlist) return null;

  const { name, id, track_count, matched_count, avg_actual, avg_predicted,
    avg_energy, avg_replayability, top_moods, top_eras, tracks } = playlist;

  const insight = generateInsight(playlist);

  return (
    <div className="playlist-card">
      <div className="playlist-card-header">
        <div>
          <h2 className="playlist-card-title">{name}</h2>
          <div className="playlist-card-count">
            {track_count} tracks{matched_count < track_count ? ` (${matched_count} rated)` : ''}
          </div>
          <a
            className="playlist-spotify-link"
            href={`https://open.spotify.com/playlist/${id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Spotify &#8599;
          </a>
        </div>
        <div className="playlist-scores">
          {avg_predicted != null && (
            <div className="playlist-score">
              <span className="playlist-score-value" style={{ color: ratingColor(avg_predicted) }}>
                {avg_predicted.toFixed(1)}
              </span>
              <span className="playlist-score-label">Predicted</span>
            </div>
          )}
          {avg_actual != null && (
            <div className="playlist-score">
              <span className="playlist-score-value" style={{ color: ratingColor(avg_actual) }}>
                {avg_actual.toFixed(1)}
              </span>
              <span className="playlist-score-label">Your Score</span>
            </div>
          )}
        </div>
      </div>

      <div className="playlist-summary">
        {top_moods && top_moods.map(m => (
          <span key={m} className="playlist-tag playlist-tag-accent">{m}</span>
        ))}
        {top_eras && top_eras.map(e => (
          <span key={e} className="playlist-tag">{e}</span>
        ))}
        {avg_energy != null && (
          <span className="playlist-tag">Energy: {avg_energy}</span>
        )}
        {avg_replayability != null && (
          <span className="playlist-tag">Replay: {(avg_replayability * 100).toFixed(0)}%</span>
        )}
      </div>

      <div className="playlist-insight">{insight}</div>

      <button
        className="playlist-expand-btn"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`playlist-expand-arrow${expanded ? ' open' : ''}`}>&#9654;</span>
        {expanded ? 'Hide tracks' : 'Show tracks'}
      </button>

      {expanded && tracks && (
        <div className="playlist-tracks">
          {tracks.map((t, i) => (
            <div key={`${t.title}-${t.artist}-${i}`} className="playlist-track-row">
              <div className="playlist-track-info">
                <span
                  className="playlist-track-dot"
                  style={{
                    backgroundColor: t.matched
                      ? ratingColor(t.actual)
                      : 'var(--muted-2)',
                  }}
                />
                <span className="playlist-track-title">{t.title}</span>
                <span className="playlist-track-artist">{t.artist}</span>
              </div>
              {t.matched ? (
                <div className="playlist-track-ratings">
                  <div className="playlist-track-rating">
                    <div className="playlist-track-rating-value" style={{ color: ratingColor(t.actual) }}>
                      {t.actual}
                    </div>
                    <div className="playlist-track-rating-label">Actual</div>
                  </div>
                  <div className="playlist-track-rating">
                    <div className="playlist-track-rating-value" style={{ color: ratingColor(t.predicted) }}>
                      {t.predicted}
                    </div>
                    <div className="playlist-track-rating-label">Predicted</div>
                  </div>
                </div>
              ) : (
                <span className="playlist-track-unrated">Unrated</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Playlists() {
  const { data, manifest, loading, error, currentVersion, switchVersion } = useDashboardData();

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, color: 'var(--bad)' }}>Error: {error}</div>;

  const playlists = data?.playlists || [];
  const loadableVersions = manifest
    ? manifest.versions.filter(v => v.is_major || v.version === manifest.current_version)
    : [];

  return (
    <>
      <Navigation showSections={false} />
      <div className="playlists-wrapper">
        <div className="playlists-header">
          <p className="eyebrow">Jazz Taste Model</p>
          <h1>Your Jazz Playlists</h1>
          <p className="subtitle">
            How your curated playlists perform against the taste model.
            Each playlist is matched against your rated tracks to show predicted and actual scores.
          </p>
          {loadableVersions.length > 1 && (
            <div style={{ marginTop: '12px' }}>
              <select
                className="version-select"
                value={currentVersion || ''}
                onChange={e => switchVersion(e.target.value)}
              >
                {[...loadableVersions].reverse().map(v => (
                  <option key={v.version} value={v.version}>
                    v{v.version}{v.name ? ` "${v.name}"` : ''}{v.is_major ? ' ★' : ''} — {v.dataset_size} tracks
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {playlists.length === 0 && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
            No playlist data available. Run train.py to generate playlist analytics.
          </div>
        )}

        {playlists.map(pl => (
          <PlaylistCard key={pl.id} playlist={pl} />
        ))}
      </div>
    </>
  );
}
