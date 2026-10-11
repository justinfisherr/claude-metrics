import { useState } from 'react';
import Navigation from '../components/shared/Navigation';
import '../styles/search.css';
import { MOODS, SUBGENRES, INSTRUMENTS, ERAS, PRIMARY_INSTRUMENTS } from '../data/tagOptions';

const API = 'https://jazz-score-api.vercel.app';

function verdict(score) {
  if (score >= 8.5) return { label: 'STRONG RECOMMEND', color: 'var(--good)' };
  if (score >= 7) return { label: 'RECOMMEND', color: 'var(--accent)' };
  if (score >= 5.5) return { label: 'MAYBE', color: 'var(--warning)' };
  return { label: 'SKIP', color: 'var(--bad)' };
}

function ChipGroup({ label, options, selected, onToggle }) {
  return (
    <div className="chip-group">
      <div className="chip-label">{label}</div>
      <div className="chips">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className={`chip ${selected.includes(o) ? 'chip-on' : ''}`}
            onClick={() => onToggle(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(null);
  const [ratingMsg, setRatingMsg] = useState(null);

  const [moods, setMoods] = useState([]);
  const [subgenres, setSubgenres] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [era, setEra] = useState('');
  const [primary, setPrimary] = useState('');
  const [tagsMsg, setTagsMsg] = useState(null);

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function resetState() {
    setResult(null);
    setRating(null);
    setRatingMsg(null);
    setTagsMsg(null);
    setMoods([]);
    setSubgenres([]);
    setInstruments([]);
    setEra('');
    setPrimary('');
  }

  async function run(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults(null);
    resetState();
    try {
      const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function pick(id) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/score?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      setResults(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function rate(r) {
    if (!result) return;
    setRatingMsg(null);
    try {
      const res = await fetch(`${API}/api/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          artist: result.artist,
          rating: r,
          spotify_id: result.spotify_id,
          year: result.year,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRating(r);
      setRatingMsg('Rating saved');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveTags() {
    if (!result || rating == null) return;
    setTagsMsg(null);
    try {
      const res = await fetch(`${API}/api/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          artist: result.artist,
          rating,
          moods,
          subgenres,
          instrumentation: instruments,
          era: era || undefined,
          primary_instrument: primary || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setTagsMsg('Tags saved to your dataset');
    } catch (err) {
      setError(err.message);
    }
  }

  const v = result ? verdict(result.score) : null;

  return (
    <div className="search-page">
      <Navigation />
      <main className="search-main">
        <h1 className="search-title">Score a track</h1>
        <p className="search-sub">Search Spotify, pick a track, and run it through your taste model.</p>

        <form className="search-form" onSubmit={run}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Giant Steps"
            autoFocus
            aria-label="Track search"
          />
          <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </form>

        {loading && <p className="search-note">Searching Spotify…</p>}
        {error && <p className="search-error">{error}</p>}

        {results && !result && (
          <div className="pl-results">
            {results.length === 0 && <p className="search-note">No results.</p>}
            {results.map((r) => (
              <button key={r.id} className="pl-card" onClick={() => pick(r.id)}>
                {r.image ? <img className="pl-img" src={r.image} alt={r.title} /> : null}
                <div className="pl-info">
                  <div className="pl-name">{r.title}</div>
                  <div className="pl-owner">{r.artist}{r.year ? ` · ${r.year}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {result && v && (
          <div className="search-result">
            <button className="pl-back" onClick={resetState} style={{ position: 'absolute', top: 16, right: 16 }}>← Back</button>
            <div className="sr-head">
              {result.image ? <img className="sr-image" src={result.image} alt={result.title} /> : null}
              <div>
                <div className="sr-title">
                  {result.title} <span className="sr-artist">— {result.artist}</span>
                </div>
                {result.year ? (
                  <div className="sr-meta">
                    {result.year} · {result.tempo} tempo · popularity {result.popularity}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="sr-score" style={{ color: v.color }}>
              {result.score}
              <span className="sr-out">/10</span>
            </div>
            <div className="sr-verdict" style={{ color: v.color }}>{v.label}</div>
            {result.url ? (
              <a className="sr-link" href={result.url} target="_blank" rel="noopener noreferrer">
                Listen on Spotify ↗
              </a>
            ) : null}

            <div className="rate-row">
              <span className="rate-label">Your rating:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                <button
                  key={r}
                  className={`rate-btn ${rating === r ? 'rate-selected' : ''}`}
                  onClick={() => rate(r)}
                  aria-label={`Rate ${r}`}
                >
                  {r}
                </button>
              ))}
              {ratingMsg ? <span className="rate-done">{ratingMsg} ({rating}/10)</span> : null}
            </div>

            {rating != null && (
              <div className="tag-editor">
                <ChipGroup label="Moods" options={MOODS} selected={moods} onToggle={(m) => toggle(moods, setMoods, m)} />
                <ChipGroup label="Subgenres" options={SUBGENRES} selected={subgenres} onToggle={(s) => toggle(subgenres, setSubgenres, s)} />
                <ChipGroup label="Instrumentation" options={INSTRUMENTS} selected={instruments} onToggle={(i) => toggle(instruments, setInstruments, i)} />
                <div className="tag-selects">
                  <select value={era} onChange={(e) => setEra(e.target.value)} aria-label="Era">
                    <option value="">Era (optional)</option>
                    {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <select value={primary} onChange={(e) => setPrimary(e.target.value)} aria-label="Primary instrument">
                    <option value="">Primary instrument (optional)</option>
                    {PRIMARY_INSTRUMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <button className="save-tags" onClick={saveTags}>Save tags</button>
                {tagsMsg ? <span className="rate-done">{tagsMsg}</span> : null}
              </div>
            )}

            {result.audio_only ? (
              <div className="sr-note">
                Audio profile only until you tag it — rate it and add moods/subgenres/instruments above for an accurate prediction.
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
