import { useCallback, useState } from 'react';
import Navigation from '../components/shared/Navigation';
import TrackReviewPanel from '../components/TrackReviewPanel';
import { useAuth } from '../lib/authContext';
import { authHeaders } from '../lib/auth';
import useSpotifyPlayer from '../hooks/useSpotifyPlayer';
import SpotifyPlayerBar from '../components/SpotifyPlayerBar';
import '../styles/search.css';
import '../styles/ai.css';

const API = 'https://jazz-score-api.vercel.app';

const appUri = (kind, id) => (id ? `spotify:${kind}:${id}` : null);

const KINDS = [
  { key: 'track', label: 'Track' },
  { key: 'album', label: 'Album' },
  { key: 'playlist', label: 'Playlist' },
];

const EXAMPLES = {
  track: ['Modal and spacious, not a greatest-hits pick', 'Something like Speak No Evil but outside my usual lane', 'A ballad with a lot of air in it'],
  album: ['A 1960s Blue Note album I have not rated', 'Something spiritual and large-ensemble', 'A modern album that earns its length'],
  playlist: ['A late-night walking playlist', 'Spiritual jazz without the obvious names', 'A short hard-bop playlist for driving'],
};

function scoreColor(score) {
  if (score >= 8.5) return 'var(--good)';
  if (score >= 7) return 'var(--accent)';
  if (score >= 5.5) return 'var(--warning)';
  return 'var(--bad)';
}

function TrackCard({ rec, onReviewed }) {
  const verdict = rec.score >= 8.5 ? 'Strong recommend' : rec.score >= 7 ? 'Recommend' : rec.score >= 5.5 ? 'Maybe' : 'Skip';
  return (
    <article className="ai-card">
      <div className="ai-card-head">
        <div className="ai-art">
          {rec.image ? <img src={rec.image} alt="" /> : <span>♪</span>}
        </div>
        <div className="ai-card-id">
          <h2>{rec.title}</h2>
          <p>{rec.artist}{rec.album ? ` · ${rec.album}` : ''}{rec.year ? ` · ${rec.year}` : ''}</p>
          <div className="ai-badges">
            <span className="ai-verdict" style={{ color: scoreColor(rec.score), borderColor: scoreColor(rec.score) }}>{verdict}</span>
            {rec.confidence ? <span className="ai-tag">{rec.confidence} confidence</span> : null}
            {rec.reviewed ? <span className="ai-tag ai-tag-reviewed">Rated {rec.rating}/10</span> : <span className="ai-tag">Unrated</span>}
          </div>
        </div>
        <div className="ai-score" style={{ color: scoreColor(rec.score) }}>
          {rec.score}
          <span>/10</span>
        </div>
      </div>

      {rec.reason ? <p className="ai-reason">{rec.reason}</p> : null}
      {rec.score < 5.5 ? <p className="ai-caveat">The model is not convinced — treat this as an exploration pick, not a safe bet.</p> : null}

      <div className="ai-actions">
        {rec.spotify_id ? <a className="ai-link" href={appUri('track', rec.spotify_id)}>Open in Spotify app</a> : null}
        <a className="ai-link" href={`#/review?${new URLSearchParams({ title: rec.title, artist: rec.artist, spotify_id: rec.spotify_id || '' }).toString()}`}>Full review page →</a>
      </div>

      <div className="ai-review">
        <TrackReviewPanel
          title={rec.title}
          artist={rec.artist}
          spotifyId={rec.spotify_id}
          year={rec.year}
          initialRating={rec.rating}
          initialNotes={rec.notes}
          onSaved={(rating) => onReviewed(rec, rating)}
          onRemoved={() => onReviewed(rec, null)}
        />
      </div>
    </article>
  );
}

function AlbumCard({ rec, onRated }) {
  const { ensureAuthed } = useAuth();
  const [rating, setRating] = useState(rec.rating ?? null);
  const [busy, setBusy] = useState(false);

  const rate = async (r) => {
    if (!(await ensureAuthed())) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          title: rec.name,
          artist: rec.artist,
          rating: r,
          entity_type: 'album',
          spotify_id: rec.id,
          year: rec.year,
        }),
      });
      if (!res.ok) throw new Error('rating failed');
      setRating(r);
      if (onRated) onRated(rec, r);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="ai-card">
      <div className="ai-card-head">
        <div className="ai-art">{rec.image ? <img src={rec.image} alt="" /> : <span>♪</span>}</div>
        <div className="ai-card-id">
          <h2>{rec.name}</h2>
          <p>{rec.artist}{rec.year ? ` · ${rec.year}` : ''}{rec.track_count ? ` · ${rec.track_count} tracks` : ''}</p>
          <div className="ai-badges">
            {rec.confidence ? <span className="ai-tag">{rec.confidence} confidence</span> : null}
            {rec.reviewed ? <span className="ai-tag ai-tag-reviewed">Already reviewed</span> : <span className="ai-tag">New to you</span>}
          </div>
        </div>
      </div>
      {rec.reason ? <p className="ai-reason">{rec.reason}</p> : null}
      <div className="ai-actions">
        {rec.id ? <a className="ai-link" href={appUri('album', rec.id)}>Open in Spotify app</a> : null}
        {rec.id ? <a className="ai-link" href={`#/listen?tab=albums&id=${rec.id}`}>Score every track in Listen →</a> : null}
      </div>
      <div className="ai-album-rate">
        <span className="ai-rate-label">Rate this album:</span>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
          <button
            key={r}
            className={`ai-rate-btn${rating === r ? ' on' : ''}`}
            onClick={() => rate(r)}
            disabled={busy}
            aria-label={`Rate album ${r}`}
          >
            {r}
          </button>
        ))}
        {rating ? <span className="ai-rate-saved">Saved {rating}/10</span> : null}
      </div>
    </article>
  );
}

function PlaylistCard({ rec }) {
  return (
    <article className="ai-card">
      <div className="ai-card-head">
        <div className="ai-art">{rec.image ? <img src={rec.image} alt="" /> : <span>♪</span>}</div>
        <div className="ai-card-id">
          <h2>{rec.title}</h2>
          <p>{rec.artist || 'Spotify playlist'}{rec.track_count ? ` · ${rec.track_count} tracks` : ''}</p>
          <div className="ai-badges">
            {rec.confidence ? <span className="ai-tag">{rec.confidence} confidence</span> : null}
          </div>
        </div>
      </div>
      {rec.reason ? <p className="ai-reason">{rec.reason}</p> : null}
      <div className="ai-actions">
        {rec.id ? <a className="ai-link" href={appUri('album', rec.id)}>Open in Spotify app</a> : null}
        {rec.spotify_id ? <a className="ai-link" href={`#/listen?tab=playlists&id=${rec.spotify_id}`}>Score every track in Listen →</a> : null}
      </div>
    </article>
  );
}

export default function AI() {
  const { ensureAuthed } = useAuth();
  const [kind, setKind] = useState('track');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playError, setPlayError] = useState('');
  const [result, setResult] = useState(null);
  const player = useSpotifyPlayer();

  const ask = useCallback(async (more = false) => {
    if (!(await ensureAuthed())) return;
    setLoading(true);
    setError('');
    setPlayError('');
    if (!more) setResult(null);
    const existing = more ? (result?.recommendations || []) : [];
    const remaining = more ? Math.max(1, 10 - existing.length) : (kind === 'track' ? 10 : 2);
    try {
      const res = await fetch(`${API}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          kind,
          prompt: prompt.trim(),
          count: remaining,
          exclude: existing.map((r) => `${r.title} — ${r.artist}`),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      if (more && !body.recommendations?.length) {
        setResult((prev) => prev ? { ...prev, message: 'No more new picks came back. Try a different prompt.' } : prev);
        return;
      }
      setResult((prev) => {
        if (!more || !prev) return body;
        const merged = [...prev.recommendations, ...(body.recommendations || [])];
        const seen = new Set();
        const unique = merged.filter((r) => {
          const key = `${r.title}|${r.artist}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return { ...prev, ...body, recommendations: unique.slice(0, 10), message: null };
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ensureAuthed, kind, prompt, result]);

  const markReviewed = (rec, rating) => {
    setResult((prev) => prev ? {
      ...prev,
      recommendations: prev.recommendations.map((r) => (
        r.title === rec.title && r.artist === rec.artist ? { ...r, reviewed: rating != null, rating } : r
      )),
    } : prev);
  };

  return (
    <>
      <Navigation showSections={false} />
      <main className="ai-page">
        <header className="ai-head">
          <h1>AI Concierge</h1>
          <p>Ask for a track, album, or playlist. The AI proposes; your taste model ranks every pick. Review anything right here.</p>
        </header>

        <div className="ai-tabs">
          {KINDS.map((k) => (
            <button key={k.key} className={`mode-tab ${kind === k.key ? 'mode-tab-on' : ''}`} onClick={() => { setKind(k.key); setResult(null); }}>
              {k.label}
            </button>
          ))}
        </div>

        <div className="ai-ask">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`What kind of ${kind} are you in the mood for?`}
            rows={3}
          />
          <div className="ai-examples">
            {EXAMPLES[kind].map((example) => (
              <button key={example} className="ai-example" onClick={() => setPrompt(example)}>{example}</button>
            ))}
          </div>
          <div className="ai-submit-row">
            <span className="ai-hint">The model sees your ratings, eras, artists, and moods. It avoids things you have already rated.</span>
            <button className="ai-submit" onClick={() => ask(false)} disabled={loading}>{loading ? 'Thinking…' : 'Ask the model'}</button>
          </div>
        </div>

        {loading ? <p className="ai-note">Reading your taste profile, asking the model, then scoring the picks against the model. This can take a few seconds.</p> : null}
        {error ? <p className="search-error">{error}</p> : null}
        {result?.message ? <p className="ai-note">{result.message}</p> : null}

        {result?.recommendations?.length ? (
          <>
            <div className="ai-result-head">
              <span>{result.recommendations.length} {kind}{result.recommendations.length === 1 ? '' : 's'}</span>
              <span className="ai-model-line">{result.model} · {result.profile?.tracks} tracks in profile</span>
              {kind === 'track' && result.recommendations.some((r) => r.spotify_id) ? (
                <button
                  className="ai-playall"
                  onClick={async () => {
                    setPlayError('');
                    try {
                      await player.playAll(result.recommendations.filter((r) => r.spotify_id).map((r) => appUri('track', r.spotify_id)));
                    } catch (e) {
                      setPlayError(e.message);
                    }
                  }}
                  disabled={!player.ready}
                >
                  {player.ready ? `Play all ${result.recommendations.filter((r) => r.spotify_id).length} in order` : 'Connecting player…'}
                </button>
              ) : null}
              {kind === 'track' && result.recommendations.length < 10 ? (
                <button className="ai-more" onClick={() => ask(true)} disabled={loading}>
                  {loading ? 'Finding…' : `Find ${10 - result.recommendations.length} more`}
                </button>
              ) : null}
            </div>
            {playError ? <p className="ai-note ai-play-error">{playError}</p> : null}
            <div className="ai-grid">
              {result.recommendations.map((rec) => (
                kind === 'track' ? <TrackCard key={`${rec.title}-${rec.artist}`} rec={rec} onReviewed={markReviewed} /> :
                kind === 'album' ? <AlbumCard key={rec.id || rec.name} rec={rec} /> :
                <PlaylistCard key={rec.spotify_id || rec.title} rec={rec} />
              ))}
            </div>
          </>
        ) : null}

        {result && !result.recommendations?.length && !result.message ? (
          <p className="ai-note">No picks came back. Try a more specific prompt.</p>
        ) : null}

        <SpotifyPlayerBar player={player} />
      </main>
    </>
  );
}
