import { useState } from 'react';
import { MOODS, SUBGENRES, INSTRUMENTS, ERAS, PRIMARY_INSTRUMENTS } from '../data/tagOptions';

const API = 'https://jazz-score-api.vercel.app';

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

export default function TrackReviewPanel({ title, artist, spotifyId, year }) {
  const [rating, setRating] = useState(null);
  const [moods, setMoods] = useState([]);
  const [subgenres, setSubgenres] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [era, setEra] = useState('');
  const [primary, setPrimary] = useState('');
  const [savedMsg, setSavedMsg] = useState(null);
  const [error, setError] = useState(null);

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

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
      spotify_id: spotifyId || undefined,
      year: year || undefined,
    });
    if (ok) {
      setRating(r);
      setSavedMsg(`Saved ${r}/10`);
    }
  }

  async function saveTags() {
    if (rating == null) return;
    setSavedMsg(null);
    const ok = await post({
      title,
      artist,
      rating,
      moods,
      subgenres,
      instrumentation: instruments,
      era: era || undefined,
      primary_instrument: primary || undefined,
    });
    if (ok) setSavedMsg('Tags saved');
  }

  return (
    <div className="tag-editor inline-review">
      <div className="rate-row">
        <span className="rate-label">Rate:</span>
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

      {rating != null && (
        <>
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
        </>
      )}
    </div>
  );
}
