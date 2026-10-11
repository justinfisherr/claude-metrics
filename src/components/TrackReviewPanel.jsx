import { useState } from 'react';

const API = 'https://jazz-score-api.vercel.app';

export default function TrackReviewPanel({ title, artist, spotifyId, year, initialRating, initialNotes }) {
  const [rating, setRating] = useState(initialRating ?? null);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [savedMsg, setSavedMsg] = useState(null);
  const [error, setError] = useState(null);

  async function post(body) {
    setError(null);
    try {
      const res = await fetch(`${API}/api/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }

  async function rate(r) {
    setSavedMsg(null);
    const ok = await post({
      title,
      artist,
      rating: r,
      notes: notes.trim() || undefined,
      spotify_id: spotifyId || undefined,
      year: year || undefined,
    });
    if (ok) {
      setRating(r);
      setSavedMsg(`Saved ${r}/10`);
    }
  }

  async function saveReview() {
    if (rating == null) return;
    setSavedMsg(null);
    const ok = await post({
      title,
      artist,
      rating,
      notes: notes.trim() || undefined,
      spotify_id: spotifyId || undefined,
      year: year || undefined,
    });
    if (ok) setSavedMsg('Review saved');
  }

  return (
    <div className="inline-review">
      <div className="rate-row">
        <span className="rate-label">{initialRating != null ? 'Your rating:' : 'Rate:'}</span>
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
        {savedMsg ? <span className="rate-done">{savedMsg}</span> : null}
        {error ? <span className="search-error">{error}</span> : null}
      </div>

      <div className="review-note-row">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Your review — what stood out or didn't?"
          rows={3}
          aria-label="Review note"
        />
      </div>
      <button className="save-tags" onClick={saveReview} disabled={rating == null}>Save review</button>
    </div>
  );
}
