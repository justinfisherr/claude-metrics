import { useState } from 'react';
import Navigation from '../components/shared/Navigation';
import '../styles/search.css';

const API = 'https://jazz-score-api.vercel.app/api/score';

function verdict(score) {
  if (score >= 8.5) return { label: 'STRONG RECOMMEND', color: 'var(--good)' };
  if (score >= 7) return { label: 'RECOMMEND', color: 'var(--accent)' };
  if (score >= 5.5) return { label: 'MAYBE', color: 'var(--warning)' };
  return { label: 'SKIP', color: 'var(--bad)' };
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function run(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const v = result ? verdict(result.score) : null;

  return (
    <div className="search-page">
      <Navigation />
      <main className="search-main">
        <h1 className="search-title">Score a track</h1>
        <p className="search-sub">Search Spotify and run it through your taste model.</p>

        <form className="search-form" onSubmit={run}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Naima John Coltrane"
            autoFocus
            aria-label="Track search"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Scoring…' : 'Score'}
          </button>
        </form>

        {loading && <p className="search-note">Searching Spotify, pulling audio features…</p>}
        {error && <p className="search-error">{error}</p>}

        {result && v && (
          <div className="search-result">
            <div className="sr-title">
              {result.title} <span className="sr-artist">— {result.artist}</span>
            </div>
            {result.year ? (
              <div className="sr-meta">
                {result.year} · {result.tempo} tempo · popularity {result.popularity}
              </div>
            ) : null}
            <div className="sr-score" style={{ color: v.color }}>
              {result.score}
              <span className="sr-out">/10</span>
            </div>
            <div className="sr-verdict" style={{ color: v.color }}>{v.label}</div>
            {result.audio_only ? (
              <div className="sr-note">
                Audio profile only — no mood/subgenre/instrumentation tags, so treat it as a rough guess.
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
