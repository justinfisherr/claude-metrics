import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '../components/shared/Navigation';
import TrackReviewPanel from '../components/TrackReviewPanel';
import '../styles/search.css';

const API = 'https://jazz-score-api.vercel.app';

const GENRES = ['neo-soul', 'soul', 'r&b', 'funk', 'hip-hop', 'electronic', 'rock', 'blues', 'classical', 'folk'];

const TABS = [
  { key: 'tracks', label: 'Tracks' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'albums', label: 'Albums' },
];

function verdict(score) {
  if (score >= 8.5) return { label: 'STRONG RECOMMEND', color: 'var(--good)' };
  if (score >= 7) return { label: 'RECOMMEND', color: 'var(--accent)' };
  if (score >= 5.5) return { label: 'MAYBE', color: 'var(--warning)' };
  return { label: 'SKIP', color: 'var(--bad)' };
}

function verdictColor(score) {
  if (score >= 8.5) return 'var(--good)';
  if (score >= 7) return 'var(--accent)';
  if (score >= 5.5) return 'var(--warning)';
  return 'var(--bad)';
}

function buildParams(obj) {
  const p = {};
  Object.entries(obj).forEach(([k, v]) => { if (v) p[k] = v; });
  return p;
}

export default function Listen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : 'tracks';
  const q = searchParams.get('q') || '';
  const id = searchParams.get('id') || '';
  const genre = searchParams.get('genre') || '';

  const [query, setQuery] = useState(q);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [list, setList] = useState(null);
  const [result, setResult] = useState(null);
  const [item, setItem] = useState(null);
  const [rating, setRating] = useState(null);
  const [ratingMsg, setRatingMsg] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState('original');
  const cache = useRef({});

  useEffect(() => { setQuery(q); }, [q]);

  const resetReview = useCallback(() => {
    setRating(null);
    setRatingMsg(null);
    setExpanded(null);
    setSortBy('original');
  }, []);

  const loadTracks = useCallback(async (term) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setList(data.results || []);
      setResult(null);
      setItem(null);
      resetReview();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resetReview]);

  const loadScore = useCallback(async (sid, g) => {
    setLoading(true);
    setError(null);
    try {
      const genreParam = g ? `&genre=${encodeURIComponent(g)}` : '';
      const res = await fetch(`${API}/api/score?id=${encodeURIComponent(sid)}${genreParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      setList(null);
      setItem(null);
      resetReview();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resetReview]);

  const loadCollections = useCallback(async (term) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = tab === 'albums' ? '/api/album' : '/api/playlist';
      const key = tab === 'albums' ? 'albums' : 'playlists';
      const res = await fetch(`${API}${endpoint}?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setList(data[key] || []);
      setItem(null);
      setResult(null);
      resetReview();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, resetReview]);

  const openCollection = useCallback(async (cid) => {
    const cacheKey = `${tab}:${cid}`;
    if (cache.current[cacheKey]) {
      setItem(cache.current[cacheKey]);
      setList(null);
      resetReview();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint = tab === 'albums' ? '/api/album' : '/api/playlist';
      const res = await fetch(`${API}${endpoint}?id=${encodeURIComponent(cid)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      cache.current[cacheKey] = data;
      setItem(data);
      setList(null);
      resetReview();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, resetReview]);

  useEffect(() => {
    if (tab === 'tracks') {
      if (id) loadScore(id, genre);
      else if (q) loadTracks(q);
      else { setList(null); setResult(null); }
    } else {
      if (id) openCollection(id);
      else if (q) loadCollections(q);
      else { setList(null); setItem(null); }
    }
  }, [tab, q, id, genre, loadScore, loadTracks, openCollection, loadCollections]);

  function switchTab(t) {
    setSearchParams({ tab: t === 'tracks' ? '' : t });
  }

  function run(e) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setSearchParams(buildParams({ tab, q: term, genre: tab === 'tracks' ? genre : '' }));
  }

  function pick(pickedId) {
    setSearchParams(buildParams({ tab, id: pickedId, genre: tab === 'tracks' ? genre : '' }));
  }

  function back() {
    setSearchParams(buildParams({ tab, q, genre: tab === 'tracks' ? genre : '' }));
  }

  function onGenreChange(g) {
    setSearchParams(buildParams({ tab, q, id, genre: g }));
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

  function reviewHref(t) {
    const p = new URLSearchParams({ title: t.title, artist: t.artist });
    if (t.spotify_id) p.set('spotify_id', t.spotify_id);
    if (tab === 'albums' && item) {
      p.set('album', item.name);
      if (item.year) p.set('year', String(item.year));
    }
    return `#/review?${p.toString()}`;
  }

  function onTrackSaved(track, r) {
    const update = (it) => (it ? {
      ...it,
      tracks: it.tracks.map((x) => (
        x.title === track.title && x.artist === track.artist ? { ...x, reviewed: true, rating: r } : x
      )),
    } : it);
    setItem((prev) => update(prev));
    const cacheKey = `${tab}:${id}`;
    if (cache.current[cacheKey]) cache.current[cacheKey] = update(cache.current[cacheKey]);
  }

  function onResultSaved(r) {
    setResult((prev) => (prev ? { ...prev, reviewed: true, rating: r } : prev));
  }

  const v = result ? verdict(result.score) : null;
  const tracks = item
    ? sortBy === 'rating'
      ? [...item.tracks].sort((a, b) => b.score - a.score)
      : item.tracks
    : [];
  const placeholder = tab === 'albums' ? 'e.g. Kind of Blue' : tab === 'playlists' ? 'e.g. bebop classics' : 'e.g. Giant Steps';

  return (
    <div className="search-page">
      <Navigation />
      <main className="search-main playlist-main">
        <h1 className="search-title">Listen</h1>
        <p className="search-sub">Search Spotify, score tracks, playlists, and albums against your taste.</p>

        <div className="mode-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`mode-tab ${tab === t.key ? 'mode-tab-on' : ''}`}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form className="search-form" onSubmit={run}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoFocus
            aria-label="Search"
          />
          <button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Search'}</button>
        </form>

        {tab === 'tracks' && (
          <div className="genre-row">
            <label className="genre-label" htmlFor="genre">Genre bridge (optional)</label>
            <select id="genre" value={genre} onChange={(e) => onGenreChange(e.target.value)}>
              <option value="">None — score as jazz</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        {loading && <p className="search-note">Working… (first request can take ~30s to warm the model)</p>}
        {error && <p className="search-error">{error}</p>}

        {list && !result && !item && (
          <div className="pl-results">
            {list.length === 0 && <p className="search-note">No results.</p>}
            {list.map((r) => (
              <button key={r.id} className="pl-card" onClick={() => pick(r.id)}>
                {r.image ? <img className="pl-img" src={r.image} alt={r.title || r.name} /> : null}
                <div className="pl-info">
                  <div className="pl-name">
                    {r.title || r.name}
                    {r.reviewed ? <span className="reviewed-badge">✓ {r.rating != null ? `${r.rating}/10` : 'reviewed'}</span> : null}
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

        {result && v && (
          <div className="search-result">
            <button className="pl-back" onClick={back} style={{ position: 'absolute', top: 16, right: 16 }}>← Back</button>
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
            {result.genre ? (
              <div className="sr-note sr-bridged">Scored via the {result.genre} genre bridge — mapped onto your jazz taste.</div>
            ) : null}
            {result.url ? (
              <a className="sr-link" href={result.url} target="_blank" rel="noopener noreferrer">
                Listen on Spotify ↗
              </a>
            ) : null}

            {result.reviewed ? (
              <div className="sr-note sr-bridged">
                ✓ Reviewed — {result.rating}/10{result.notes ? ` · "${result.notes}"` : ''}
              </div>
            ) : null}

            <TrackReviewPanel
              title={result.title}
              artist={result.artist}
              spotifyId={result.spotify_id}
              year={result.year}
              initialRating={result.rating}
              initialNotes={result.notes}
              onSaved={onResultSaved}
            />

            {result.audio_only ? (
              <div className="sr-note">
                Audio profile only — rate it and leave a note to make the prediction personal.
              </div>
            ) : null}
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
              <button className="pl-back" onClick={back}>←</button>
            </div>

            {tab === 'albums' && (
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

            <div className="sort-row">
              <span className="genre-label">Order:</span>
              <button className={`mode-tab ${sortBy === 'original' ? 'mode-tab-on' : ''}`} onClick={() => setSortBy('original')}>Original</button>
              <button className={`mode-tab ${sortBy === 'rating' ? 'mode-tab-on' : ''}`} onClick={() => setSortBy('rating')}>By rating</button>
            </div>

            <ul className="pl-tracks">
              {tracks.map((t) => {
                const key = t.title + t.artist;
                const isOpen = expanded === key;
                return (
                  <li key={key} className="pl-track-item">
                    <div
                      className="pl-track"
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpanded(isOpen ? null : key)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(isOpen ? null : key); }}
                    >
                      {t.image ? <img className="pl-img-sm" src={t.image} alt={t.title} /> : null}
                      <div className="pl-track-info">
                        <div className="pl-track-title">{t.title} <span className="sr-artist">— {t.artist}</span></div>
                        {t.reviewed ? (
                          <a className="reviewed-badge reviewed-link" href={reviewHref(t)} onClick={(e) => e.stopPropagation()} title="Open full review">
                            ✓ {t.rating != null ? `${t.rating}/10` : 'reviewed'} → open
                          </a>
                        ) : null}
                      </div>
                      <div className="pl-score" style={{ color: verdictColor(t.score) }}>{t.score}</div>
                      {t.url ? (
                        <a className="pl-listen" href={t.url} target="_blank" rel="noopener noreferrer" aria-label="Listen" onClick={(e) => e.stopPropagation()}>↗</a>
                      ) : null}
                    </div>
                    {isOpen && (
                      <TrackReviewPanel
                        title={t.title}
                        artist={t.artist}
                        spotifyId={t.spotify_id}
                        year={item.year}
                        initialRating={t.rating}
                        initialNotes={t.notes}
                        onSaved={(r) => onTrackSaved(t, r)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
