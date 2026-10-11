import { useState } from 'react';

const API = 'https://jazz-score-api.vercel.app';

function formatRating(r) {
  if (r == null) return '—';
  const v = Math.round(r * 10) / 10;
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export default function TrackReviewPanel({ title, artist, spotifyId, year, initialRating, initialNotes, onSaved }) {
  const [rating, setRating] = useState(initialRating ?? 5);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [savedMsg, setSavedMsg] = useState(null);
  const [error, setError] = useState(null);

  async function saveReview() {
    setSavedMsg(null);
    try {
      const res = await fetch(`${API}/api/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist,
          rating,
          notes: notes.trim() || undefined,
          spotify_id: spotifyId || undefined,
          year: year || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSavedMsg('Review saved');
      if (onSaved) onSaved(rating);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="inline-review">
      <div className="rate-row">
        <span className="rate-label">{initialRating != null ? 'Your rating:' : 'Rate:'}</span>
        <input
          type="range"
          min="1"
          max="10"
          step="0.2"
          value={rating}
          onChange={(e) => setRating(parseFloat(e.target.value))}
          className="review-slider"
          aria-label="Rating"
        />
        <span className="slider-value">{formatRating(rating)}</span>
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
      <button className="save-tags" onClick={saveReview}>Save review</button>
    </div>
  );
}
