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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function search(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setPlaylist(null);
    try {
      const res = await fetch(`${API}/api/playlist?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data.playlists || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openPlaylist(id) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/playlist?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPlaylist(data);
      setResults(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const tracks = playlist ? [...playlist.tracks].sort((a, b) => b.score - a.score) : [];

  return (
    <div className="search-page">
      <Navigation />
      <main className="search-main playlist-main">
        <h1 className="search-title">Score a playlist</h1>
        <p className="search-sub">Search a Spotify playlist and score every track at a glance.</p>

        <form className="search-form" onSubmit={search}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. bebop classics"
            autoFocus
            aria-label="Playlist search"
          />
          <button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Search'}</button>
        </form>

        {error && <p className="search-error">{error}</p>}
        {loading && <p className="search-note">Working… (first request can take ~30s to warm the model)</p>}

        {results && !playlist && (
          <div className="pl-results">
            {results.map((p) => (
              <button key={p.id} className="pl-card" onClick={() => openPlaylist(p.id)}>
                {p.image ? <img className="pl-img" src={p.image} alt={p.name} /> : null}
                <div className="pl-info">
                  <div className="pl-name">{p.name}</div>
                  <div className="pl-owner">{p.owner} · {p.track_count} tracks</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {playlist && (
          <div className="pl-view">
            <div className="pl-head">
              {playlist.image ? <img className="pl-img-lg" src={playlist.image} alt={playlist.name} /> : null}
              <div>
                <div className="sr-title">{playlist.name}</div>
                <div className="sr-meta">{playlist.owner} · {playlist.tracks.length} tracks</div>
                {playlist.url ? (
                  <a className="sr-link" href={playlist.url} target="_blank" rel="noopener noreferrer">Open in Spotify ↗</a>
                ) : null}
              </div>
              <button className="pl-back" onClick={() => { setPlaylist(null); setResults(null); }}>←</button>
            </div>
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
