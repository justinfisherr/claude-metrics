import { useState, useEffect, useMemo, useRef } from 'react';
import Navigation from '../components/shared/Navigation';

const TABS = [
  { key: 'tracks', label: 'Top Tracks' },
  { key: 'artists', label: 'Top Artists' },
  { key: 'albums', label: 'Top Albums' },
  { key: 'albums-liked', label: 'Albums by Liked' },
];

const FILTER_CATEGORIES = [
  { key: 'era', label: 'Era' },
  { key: 'mood', label: 'Mood' },
  { key: 'instrument', label: 'Instrument' },
  { key: 'liked', label: 'Liked' },
];

function CoverFlow({ items }) {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !el.children.length) return;
    requestAnimationFrame(() => {
      el.scrollTo({ left: 0, behavior: 'instant' });
    });
  }, [items]);

  if (!items.length) return <div className="empty-state">No matches for these filters.</div>;

  return (
    <div className="coverflow-container">
      <ul className="coverflow" ref={listRef}>
        {items.map((item, i) => (
          <li key={item.id || i} className="coverflow-item">
            <div className="cover-card">
              <span className="cover-rank">#{i + 1}</span>
              {item.artwork ? (
                <img
                  className="cover-art"
                  src={item.artwork}
                  alt={item.title}
                  draggable={false}
                  loading="lazy"
                />
              ) : (
                <div className="cover-placeholder">
                  <span className="cover-placeholder-text">
                    {item.title.split(' ').map(w => w[0]).join('').slice(0, 3)}
                  </span>
                </div>
              )}
              <div className="cover-info">
                <span className="cover-title">{item.title}</span>
                {item.subtitle && <span className="cover-artist">{item.subtitle}</span>}
                <span className="cover-rating">{item.rating}</span>
                {item.meta && <span className="cover-meta">{item.meta}</span>}
                {item.tags && item.tags.length > 0 && (
                  <div className="cover-tags">
                    {item.tags.slice(0, 3).map((t, j) => (
                      <span key={j} className="cover-tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="coverflow-hint">Scroll to browse</p>
    </div>
  );
}

function toggleFilter(filters, category, value) {
  const current = filters[category] || [];
  const next = current.includes(value)
    ? current.filter(v => v !== value)
    : [...current, value];
  return { ...filters, [category]: next.length ? next : undefined };
}

export default function Wrapped() {
  const [tracks, setTracks] = useState([]);
  const [artwork, setArtwork] = useState({ albums: {}, artists: {} });
  const [tab, setTab] = useState('tracks');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [openFilter, setOpenFilter] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('training-data.json').then(r => r.json()),
      fetch('artwork-cache.json').then(r => r.json()).catch(() => ({ albums: {}, artists: {} })),
    ]).then(([t, a]) => {
      setTracks(t);
      setArtwork(a);
      setLoading(false);
    });
  }, []);

  const filterOptions = useMemo(() => {
    const eras = new Set();
    const moods = new Set();
    const instruments = new Set();
    tracks.forEach(t => {
      if (t.era) eras.add(t.era);
      (t.moods || []).forEach(m => moods.add(m));
      if (t.primary_instrument) instruments.add(t.primary_instrument);
    });
    return {
      era: [...eras].sort(),
      mood: [...moods].sort(),
      instrument: [...instruments].sort(),
      liked: ['yes', 'no'],
    };
  }, [tracks]);

  const filteredTracks = useMemo(() =>
    tracks.filter(t => {
      if (filters.era?.length && !filters.era.includes(t.era)) return false;
      if (filters.mood?.length && !(t.moods || []).some(m => filters.mood.includes(m))) return false;
      if (filters.instrument?.length && !filters.instrument.includes(t.primary_instrument)) return false;
      if (filters.liked?.length) {
        if (filters.liked.includes('yes') && !filters.liked.includes('no') && !t.liked) return false;
        if (filters.liked.includes('no') && !filters.liked.includes('yes') && t.liked) return false;
      }
      return true;
    }),
    [tracks, filters]
  );

  const hasFilters = Object.values(filters).some(v => v?.length);

  const topTracks = useMemo(() =>
    [...filteredTracks]
      .sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title))
      .map((t, i) => ({
        id: `track-${i}-${t.title}`,
        title: t.title,
        subtitle: t.artist,
        rating: `${t.rating}/10`,
        artwork: artwork.albums[t.album],
        meta: [t.era, t.year].filter(Boolean).join(' · '),
        tags: t.moods || [],
      })),
    [filteredTracks, artwork]
  );

  const topArtists = useMemo(() => {
    const map = {};
    filteredTracks.forEach(t => {
      if (!map[t.artist]) map[t.artist] = { tracks: [], total: 0, liked: 0, bestRating: 0, bestAlbum: null };
      const a = map[t.artist];
      a.tracks.push(t);
      a.total += t.rating;
      if (t.liked) a.liked++;
      if (t.rating > a.bestRating) { a.bestRating = t.rating; a.bestAlbum = t.album; }
    });
    return Object.entries(map)
      .filter(([, a]) => a.tracks.length >= 2)
      .map(([name, a]) => ({
        id: `artist-${name}`,
        title: name,
        subtitle: `${a.tracks.length} tracks rated`,
        rating: (a.total / a.tracks.length).toFixed(1),
        artwork: artwork.artists[name],
        meta: `${a.liked} liked`,
        tags: [],
      }))
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating) || a.title.localeCompare(b.title));
  }, [filteredTracks, artwork]);

  const topAlbums = useMemo(() => {
    const map = {};
    filteredTracks.forEach(t => {
      if (!t.album) return;
      if (!map[t.album]) map[t.album] = { artist: t.artist, tracks: [], total: 0 };
      map[t.album].tracks.push(t);
      map[t.album].total += t.rating;
    });
    return Object.entries(map)
      .filter(([, a]) => a.tracks.length >= 2)
      .map(([name, a]) => ({
        id: `album-${name}`,
        title: name,
        subtitle: a.artist,
        rating: (a.total / a.tracks.length).toFixed(1),
        artwork: artwork.albums[name],
        meta: `${a.tracks.length} tracks reviewed`,
        tags: [],
      }))
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating) || a.title.localeCompare(b.title));
  }, [filteredTracks, artwork]);

  const topAlbumsLiked = useMemo(() => {
    const map = {};
    filteredTracks.forEach(t => {
      if (!t.album) return;
      if (!map[t.album]) map[t.album] = { artist: t.artist, tracks: [], liked: 0, total: 0 };
      map[t.album].tracks.push(t);
      map[t.album].total += t.rating;
      if (t.liked) map[t.album].liked++;
    });
    return Object.entries(map)
      .filter(([, a]) => a.liked > 0 && a.tracks.length >= 2)
      .map(([name, a]) => ({
        id: `liked-${name}`,
        title: name,
        subtitle: a.artist,
        rating: `${a.liked}/${a.tracks.length}`,
        artwork: artwork.albums[name],
        meta: `avg ${(a.total / a.tracks.length).toFixed(1)}/10`,
        tags: [],
      }))
      .sort((a, b) => {
        const aLiked = parseInt(a.rating);
        const bLiked = parseInt(b.rating);
        if (bLiked !== aLiked) return bLiked - aLiked;
        return parseFloat(b.meta) - parseFloat(a.meta);
      });
  }, [filteredTracks, artwork]);

  const tabData = { tracks: topTracks, artists: topArtists, albums: topAlbums, 'albums-liked': topAlbumsLiked };
  const avgRating = tracks.length ? (tracks.reduce((s, t) => s + t.rating, 0) / tracks.length).toFixed(1) : '—';
  const likedCount = tracks.filter(t => t.liked).length;
  const uniqueArtists = new Set(tracks.map(t => t.artist)).size;

  return (
    <>
      <Navigation showSections={false} />
      <main className="wrapped-page">
        <header className="wrapped-header">
          <h1 className="wrapped-title">Your Jazz Wrapped</h1>
          <p className="wrapped-subtitle">Everything you've rated, ranked by your taste</p>
          <div className="wrapped-stats">
            <div className="wrapped-stat">
              <span className="wrapped-stat-value">{tracks.length}</span>
              <span className="wrapped-stat-label">Tracks</span>
            </div>
            <div className="wrapped-stat">
              <span className="wrapped-stat-value">{uniqueArtists}</span>
              <span className="wrapped-stat-label">Artists</span>
            </div>
            <div className="wrapped-stat">
              <span className="wrapped-stat-value">{avgRating}</span>
              <span className="wrapped-stat-label">Avg Rating</span>
            </div>
            <div className="wrapped-stat">
              <span className="wrapped-stat-value">{likedCount}</span>
              <span className="wrapped-stat-label">Liked</span>
            </div>
          </div>
        </header>

        <div className="wrapped-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`wrapped-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="wrapped-filters">
          <div className="filter-bar">
            {FILTER_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                className={`filter-cat-btn${openFilter === cat.key ? ' open' : ''}${filters[cat.key]?.length ? ' has-selection' : ''}`}
                onClick={() => setOpenFilter(openFilter === cat.key ? null : cat.key)}
              >
                {cat.label}
                {filters[cat.key]?.length ? ` (${filters[cat.key].length})` : ''}
              </button>
            ))}
            {hasFilters && (
              <button className="filter-clear" onClick={() => { setFilters({}); setOpenFilter(null); }}>
                Clear
              </button>
            )}
          </div>
          {openFilter && filterOptions[openFilter] && (
            <div className="filter-chips">
              {filterOptions[openFilter].map(val => (
                <button
                  key={val}
                  className={`filter-chip${(filters[openFilter] || []).includes(val) ? ' selected' : ''}`}
                  onClick={() => setFilters(f => toggleFilter(f, openFilter, val))}
                >
                  {val}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>Loading...</p>
        ) : (
          <CoverFlow key={`${tab}-${JSON.stringify(filters)}`} items={tabData[tab] || []} />
        )}
      </main>
    </>
  );
}
