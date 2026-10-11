import { useState } from 'react';
import Navigation from '../components/shared/Navigation';
import '../styles/search.css';

const API = 'https://jazz-score-api.vercel.app';

function verdictColor(score) {
  if (score >= 8.5) return 'var(--good)';
  if (score >= 7) return 'var(--accent)';
  if (score >= 5.5) return 'var(--warning)';
  return 'var(--bad)';
}

export default function Playlist() {
  const [mode, setMode] = useState('playlist');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(null);
  const [ratingMsg, setRatingMsg] = useState(null);

  function switchMode(m) {
    setMode(m);
    setResults(null);
    setItem(null);
    setError(null);
    setRating(null);
    setRatingMsg(null);
  }

  async function search(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setItem(null);
    setRating(null);
    setRatingMsg(null);
    try {
      const endpoint = mode === 'album' ? '/api/album' : '/api/playlist';
      const key = mode === 'album' ? 'albums' : 'playlists';
      const res = await fetch(`${API}${endpoint}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data[key] || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function open(id) {
    setLoading(true);
    setError(null);
    setRating(null);
    setRatingMsg(null);
    try {
      const endpoint = mode === 'album' ? '/api/album' : '/api/playlist';
      const res = await fetch(`${API}${endpoint}?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItem(data);
      setResults(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function rateAlbum(r) {
    if (!item) return;
    setRatingMsg(null);
    try {
      const res = await fetch(`${API}/api/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.name,
          artist: item.artist,
          rating: r,
          entity_type: 'album',
          spotify_id: item.album_id,
          year: item.year,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRating(r);
      setRatingMsg('Album rating saved');
    } catch (err) {
      setError(err.message);
    }
  }

  const tracks = item ? [...item.tracks].sort((a, b) => b.score - a.score) : [];

  return (
    <div className="search-page">
      <Navigation />
      <main className="search-main playlist-main">
        <h1 className="search-title">Score a {mode === 'album' ? 'album' : 'playlist'}</h1>
        <p className="search-sub">
          Search a Spotify {mode === 'album' ? 'album' : 'playlist'} and score every track at a glance.
        </p>

        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'playlist' ? 'mode-tab-on' : ''}`}
            onClick={() => switchMode('playlist')}
          >
            Playlists
          </button>
          <button
            className={`mode-tab ${mode === 'album' ? 'mode-tab-on' : ''}`}
            onClick={() => switchMode('album')}
          >
            Albums
          </button>
        </div>

        <form className="search-form" onSubmit={search}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'album' ? 'e.g. Kind of Blue' : 'e.g. bebop classics'}
            autoFocus
            aria-label="Search"
          />
          <button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Search'}</button>
        </form>

        {error && <p className="search-error">{error}</p>}
        {loading && <p className="search-note">Working… (first request can take ~30s to warm the model)</p>}

        {results && !item && (
          <div className="pl-results">
            {results.map((r) => (
              <button key={r.id} className="pl-card" onClick={() => open(r.id)}>
                {r.image ? <img className="pl-img" src={r.image} alt={r.name} /> : null}
                <div className="pl-info">
                  <div className="pl-name">
                    {r.name}
                    {r.reviewed ? <span className="reviewed-badge">✓ reviewed</span> : null}
                  </div>
                  <div className="pl-owner">
                    {r.artist || r.owner}
                    {r.year ? ` · ${r.year}` : ''}
                    {r.track_count != null ? ` · ${r.track_count} tracks` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {item && (
          <div className="pl-view">
            <div className="pl-head">
              {item.image ? <img className="pl-img-lg" src={item.image} alt={item.name} /> : null}
              <div>
                <div className="sr-title">{item.name}</div>
                <div className="sr-meta">
                  {item.artist || item.owner}
                  {item.year ? ` · ${item.year}` : ''}
                  {` · ${item.tracks.length} tracks`}
                </div>
                {item.url ? (
                  <a className="sr-link" href={item.url} target="_blank" rel="noopener noreferrer">Open in Spotify ↗</a>
                ) : null}
              </div>
              <button className="pl-back" onClick={() => { setItem(null); setResults(null); }}>←</button>
            </div>

            {mode === 'album' && (
              <div className="rate-row album-rate">
                <span className="rate-label">Rate this album:</span>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                  <button
                    key={r}
                    className={`rate-btn ${rating === r ? 'rate-selected' : ''}`}
                    onClick={() => rateAlbum(r)}
                    aria-label={`Rate album ${r}`}
                  >
                    {r}
                  </button>
                ))}
                {ratingMsg ? <span className="rate-done">{ratingMsg} ({rating}/10)</span> : null}
              </div>
            )}

            <ul className="pl-tracks">
              {tracks.map((t) => (
                <li key={t.title + t.artist} className="pl-track">
                  {t.image ? <img className="pl-img-sm" src={t.image} alt={t.title} /> : null}
                  <div className="pl-track-info">
                    <div className="pl-track-title">{t.title} <span className="sr-artist">— {t.artist}</span></div>
                  </div>
                  <div className="pl-score" style={{ color: verdictColor(t.score) }}>{t.score}</div>
                  {t.url ? (
                    <a className="pl-listen" href={t.url} target="_blank" rel="noopener noreferrer" aria-label="Listen">↗</a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
