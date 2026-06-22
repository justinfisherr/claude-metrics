import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/compare', label: 'Compare Models' },
  { path: '/review', label: 'Review' },
  { path: '/dictionary', label: 'Dictionary' },
  { path: '/playlists', label: 'Playlists' },
];

const SECTIONS = [
  { label: 'Overview', items: [
    { id: 'taste-summary-panel', label: 'Taste Summary' },
    { id: 'metrics-panel', label: 'Model' },
    { id: 'hof-panel', label: 'Hall of Fame' },
  ]},
  { label: 'Patterns', items: [
    { id: 'clusters-panel', label: 'Clusters' },
    { id: 'radar-panel', label: 'Profiles' },
    { id: 'constellation-panel', label: 'Constellation' },
    { id: 'importance-panel', label: 'Features' },
    { id: 'correlations-panel', label: 'Correlations' },
  ]},
  { label: 'Ratings', items: [
    { id: 'pred-actual-panel', label: 'Predicted vs Actual' },
    { id: 'distribution-panel', label: 'Distribution' },
    { id: 'misses-panel', label: 'Biggest Misses' },
    { id: 'year-rating-panel', label: 'By Year' },
    { id: 'duration-rating-panel', label: 'By Duration' },
  ]},
  { label: 'Music', items: [
    { id: 'era-panel', label: 'Eras' },
    { id: 'instrument-panel', label: 'Instruments' },
    { id: 'instrument-combos-panel', label: 'Combos' },
    { id: 'harmonic-panel', label: 'Harmony' },
    { id: 'cof-panel', label: 'Circle of Fifths' },
    { id: 'sound-panel', label: 'Sound Profile' },
    { id: 'ensemble-panel', label: 'Ensemble' },
  ]},
  { label: 'Artists', items: [
    { id: 'top-artists-panel', label: 'Top Artists' },
    { id: 'artist-journeys-panel', label: 'Journeys' },
    { id: 'label-panel', label: 'Labels' },
    { id: 'discovery-panel', label: 'Discovery' },
  ]},
  { label: 'Engagement', items: [
    { id: 'replayability-panel', label: 'Replayability' },
    { id: 'playthrough-panel', label: 'Playthrough' },
    { id: 'playthrough-era-panel', label: 'By Era' },
    { id: 'mood-rating-panel', label: 'Mood x Rating' },
    { id: 'polarity-panel', label: 'Mood Polarity' },
    { id: 'v2features-panel', label: 'v2 Features' },
  ]},
  { label: 'Meta', items: [
    { id: 'taste-world-panel', label: 'Taste vs World' },
    { id: 'albums-panel', label: 'Albums' },
    { id: 'history-panel', label: 'History' },
  ]},
];

export default function Navigation({ showSections = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation();

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <nav className="section-nav">
      <button
        className="hamburger-btn"
        onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
      >
        <span /><span /><span />
      </button>
      <div className={`page-menu${menuOpen ? ' open' : ''}`}>
        {PAGES.map(p => (
          <Link key={p.path} to={p.path} className={location.pathname === p.path ? 'active' : ''}>
            {p.label}
          </Link>
        ))}
      </div>
      {showSections && (
        <>
          <input
            className="nav-search"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="nav-links">
            {SECTIONS.map(section => {
              const filtered = section.items.filter(i =>
                !search || i.label.toLowerCase().includes(search.toLowerCase())
              );
              if (!filtered.length) return null;
              return [
                <span key={`label-${section.label}`} className="nav-section-label">{section.label}</span>,
                ...filtered.map(item => (
                  <a key={item.id} className="nav-link" href={`#${item.id}`}>{item.label}</a>
                ))
              ];
            }).flat().filter(Boolean)}
          </div>
        </>
      )}
    </nav>
  );
}
