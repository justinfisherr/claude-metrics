import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '../components/shared/Navigation';
import '../styles/review.css';

const STORAGE_KEY = 'jazz-reviews';

const MOOD_SECTIONS = [
  {
    label: 'Warm & romantic',
    moods: ['romantic', 'tender', 'warm', 'joyful', 'hopeful', 'pretty', 'lovely', 'cute', 'intimate'],
  },
  {
    label: 'Jazz energy',
    moods: ['cool', 'bluesy', 'groovy', 'swinging', 'sensual', 'captivating', 'sexy', 'fun'],
  },
  {
    label: 'Emotional depth',
    moods: ['melancholic', 'bittersweet', 'mournful', 'nostalgic', 'longing', 'dramatic', 'intense', 'moody', 'dark'],
  },
  {
    label: 'Texture & feel',
    moods: ['lush', 'sparse', 'gentle', 'restless', 'meditative', 'spacious', 'smooth'],
  },
  {
    label: 'Sound & innovation',
    moods: ['experimental'],
  },
  {
    label: 'Not landing',
    moods: ['flat', 'languid', 'sleepy', 'repetitive', 'background', 'uninteresting'],
  },
];

function ratingColor(r) {
  if (r >= 9) return '#50c878';
  if (r >= 7) return '#4a9eff';
  if (r >= 5) return '#ffc144';
  return '#ff6b6b';
}

function loadReviews() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function Review() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // Form state
  const [title, setTitle] = useState(params.get('title') || '');
  const [artist, setArtist] = useState(params.get('artist') || '');
  const [rating, setRating] = useState(parseFloat(params.get('rating')) || 6);
  const [replayability, setReplayability] = useState(parseInt(params.get('replayability'), 10) || 5);
  const [playthrough, setPlaythrough] = useState(parseInt(params.get('playthrough'), 10) || 100);
  const [liked, setLiked] = useState(() => {
    const v = params.get('liked');
    if (v === 'true') return true;
    if (v === 'false') return false;
    return null;
  });
  const [skipAt, setSkipAt] = useState('');
  const [skipTotal, setSkipTotal] = useState('');
  const [selectedMoods, setSelectedMoods] = useState(new Set());
  const [notes, setNotes] = useState('');
  const [favMoments, setFavMoments] = useState('');

  // Pending reviews
  const [reviews, setReviews] = useState(loadReviews);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  // Banner info from query params
  const album = params.get('album') || '';
  const year = params.get('year') || '';
  const spotifyId = params.get('spotify_id') || '';
  const showBanner = !!(params.get('title') || params.get('artist'));

  const bannerTitle = [params.get('title'), params.get('artist')].filter(Boolean).join(' — ');
  const bannerMeta = [album, year, spotifyId ? `spotify:${spotifyId}` : ''].filter(Boolean).join(' · ');

  // Persist reviews to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  }, [reviews]);

  const showToast = useCallback((msg, color = null) => {
    setToastMsg(msg);
    setToastColor(color);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  }, []);

  const toggleMood = useCallback((mood) => {
    setSelectedMoods(prev => {
      const next = new Set(prev);
      if (next.has(mood)) {
        next.delete(mood);
      } else {
        next.add(mood);
      }
      return next;
    });
  }, []);

  const resetForm = useCallback(() => {
    setTitle('');
    setArtist('');
    setRating(6);
    setReplayability(5);
    setPlaythrough(100);
    setLiked(null);
    setSkipAt('');
    setSkipTotal('');
    setSelectedMoods(new Set());
    setNotes('');
    setFavMoments('');
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    const review = {
      title: title.trim() || '(untitled)',
      artist: artist.trim() || '(unknown artist)',
      rating,
      replayability,
      liked,
      playthrough,
      skipAt: skipAt.trim() || null,
      skipTotal: skipTotal.trim() || null,
      moods: [...selectedMoods],
      notes: notes.trim(),
      favMoments: favMoments.trim() || null,
      timestamp: new Date().toISOString(),
    };

    setReviews(prev => [...prev, review]);
    showToast('Review queued!');
    resetForm();
  }, [title, artist, rating, replayability, liked, playthrough, skipAt, skipTotal, selectedMoods, notes, favMoments, showToast, resetForm]);

  const deleteReview = useCallback((index) => {
    setReviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    if (window.confirm('Clear all queued reviews?')) {
      setReviews([]);
      showToast('Cleared');
    }
  }, [showToast]);

  const exportReviews = useCallback(() => {
    const lines = reviews.map(r => {
      const parts = [
        `"${r.title}" by ${r.artist}`,
        `rating: ${r.rating}/10`,
        `replayability: ${r.replayability}/10`,
        `liked: ${r.liked === true ? 'yes' : r.liked === false ? 'no' : 'unset'}`,
        `playthrough: ${r.playthrough}%`,
      ];
      if (r.skipAt) parts.push(`skipped at ${r.skipAt} of ${r.skipTotal}`);
      if (r.moods && r.moods.length) parts.push(`moods: ${r.moods.join(', ')}`);

      let out = `Jazz review — ${parts.join(' | ')}`;
      if (r.notes) out += `\nNotes: ${r.notes}`;
      if (r.favMoments) out += `\nFavorite moments: ${r.favMoments}`;
      return out;
    }).join('\n\n---\n\n');

    const prompt = `Please log the following jazz review(s) to my dataset:\n\n${lines}`;

    navigator.clipboard.writeText(prompt).then(() => {
      showToast('Copied! Paste to Claude.');
    }).catch(() => {
      showToast('Copy failed — try selecting manually', 'var(--bad)');
    });
  }, [reviews, showToast]);

  return (
    <>
      <Navigation showSections={false} />

      <div className="review-wrapper">
        <h1>Track Review</h1>
        <p className="subtitle">Rate a track &mdash; then copy the summary to paste into Claude.</p>

        {/* Pre-filled track banner */}
        <div className={`track-banner${showBanner ? ' visible' : ''}`}>
          <div className="track-banner-title">{bannerTitle}</div>
          <div className="track-banner-meta">{bannerMeta}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="form-group">
              <label>Track Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Cantaloupe Island"
              />
            </div>
            <div className="form-group">
              <label>Artist</label>
              <input
                type="text"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="e.g. Herbie Hancock"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Rating</label>
            <div className="slider-group">
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={rating}
                onChange={e => setRating(parseFloat(e.target.value))}
              />
              <span className="slider-value">{rating}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Replayability</label>
            <div className="slider-group">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={replayability}
                onChange={e => setReplayability(parseInt(e.target.value, 10))}
              />
              <span className="slider-value">{replayability}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Liked? (would you add to a playlist?)</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn${liked === true ? ' selected' : ''}`}
                onClick={() => setLiked(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`toggle-btn${liked === false ? ' selected' : ''}`}
                onClick={() => setLiked(false)}
              >
                No
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Playthrough</label>
            <div className="slider-group">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={playthrough}
                onChange={e => setPlaythrough(parseInt(e.target.value, 10))}
              />
              <span className="slider-value">{playthrough}%</span>
            </div>
          </div>

          <div className="form-group">
            <label>Skipped at (optional)</label>
            <div className="skip-row">
              <input
                type="text"
                value={skipAt}
                onChange={e => setSkipAt(e.target.value)}
                placeholder="e.g. 1:32"
              />
              <span>of</span>
              <input
                type="text"
                value={skipTotal}
                onChange={e => setSkipTotal(e.target.value)}
                placeholder="e.g. 5:02"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Vibes / Mood Tags</label>
            <div className="mood-grid">
              {MOOD_SECTIONS.map((section) => (
                <MoodSection
                  key={section.label}
                  label={section.label}
                  moods={section.moods}
                  selectedMoods={selectedMoods}
                  onToggle={toggleMood}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How did it feel? What stood out or didn't?"
            />
          </div>

          <div className="form-group">
            <label>Favorite Moments (optional)</label>
            <input
              type="text"
              value={favMoments}
              onChange={e => setFavMoments(e.target.value)}
              placeholder="e.g. The intro, piano section around 2:30"
            />
          </div>

          <button type="submit" className="submit-btn">Add to Queue</button>
        </form>

        <div className="pending-reviews">
          <h2>Pending Reviews</h2>
          <PendingReviewsList
            reviews={reviews}
            onDelete={deleteReview}
          />
          {reviews.length > 0 && (
            <>
              <button className="export-btn" onClick={exportReviews}>
                Copy All to Clipboard
              </button>
              <button className="clear-btn" onClick={clearAll}>
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className={`review-toast${toastVisible ? ' show' : ''}`}
        style={toastColor ? { background: toastColor, color: '#fff' } : undefined}
      >
        {toastMsg}
      </div>
    </>
  );
}

function MoodSection({ label, moods, selectedMoods, onToggle }) {
  return (
    <>
      <span className="mood-section-label">{label}</span>
      {moods.map(mood => (
        <button
          key={mood}
          type="button"
          className={`mood-chip${selectedMoods.has(mood) ? ' selected' : ''}`}
          onClick={() => onToggle(mood)}
        >
          {mood}
        </button>
      ))}
    </>
  );
}

function PendingReviewsList({ reviews, onDelete }) {
  if (!reviews.length) {
    return <div className="empty-state">No reviews queued yet.</div>;
  }

  return reviews.map((r, i) => (
    <div className="review-card" key={`${r.title}-${r.timestamp}-${i}`}>
      <div className="review-card-top">
        <div className="review-card-info">
          <span className="review-card-title">{r.title} &mdash; {r.artist}</span>
          <span className="review-card-meta">
            {r.liked === true ? 'Liked' : r.liked === false ? 'Not liked' : '—'}
            {' · '}Replay: {r.replayability}/10
            {' · '}Played: {r.playthrough}%
            {r.skipAt ? ` · Skipped ${r.skipAt}/${r.skipTotal}` : ''}
          </span>
        </div>
        <div className="review-card-right">
          <span className="review-card-rating" style={{ color: ratingColor(r.rating) }}>
            {r.rating}/10
          </span>
          <button
            className="review-card-delete"
            onClick={() => onDelete(i)}
            title="Remove"
          >
            &#x2715;
          </button>
        </div>
      </div>
      {r.moods && r.moods.length > 0 && (
        <div className="review-card-moods">
          {r.moods.map(m => (
            <span key={m} className="review-mood-tag">{m}</span>
          ))}
        </div>
      )}
    </div>
  ));
}
