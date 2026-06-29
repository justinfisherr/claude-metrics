import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/wrapped', label: 'Wrapped' },
  { path: '/compare', label: 'Compare Models' },
  { path: '/review', label: 'Review' },
  { path: '/dictionary', label: 'Dictionary' },
  { path: '/playlists', label: 'Playlists' },
];

const SECTIONS = [
  { label: 'Overview', items: [
    { id: 'taste-summary-panel', label: 'Taste Summary' },
    { id: 'metrics-panel', label: 'Model' },
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
    { id: 'mind-changes-panel', label: 'Mind Changes' },
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
    { id: 'ballad-panel', label: 'Ballad Analysis' },
  ]},
  { label: 'Artists', items: [
    { id: 'top-artists-panel', label: 'Top Artists' },
    { id: 'artist-journeys-panel', label: 'Journeys' },
    { id: 'artist-era-panel', label: 'Artist × Era' },
    { id: 'collaborator-network-panel', label: 'Collaborator Network' },
    { id: 'label-panel', label: 'Labels' },
    { id: 'discovery-panel', label: 'Discovery' },
  ]},
  { label: 'Engagement', items: [
    { id: 'replayability-panel', label: 'Replayability' },
    { id: 'playthrough-panel', label: 'Playthrough' },
    { id: 'playthrough-era-panel', label: 'By Era' },
    { id: 'mood-rating-panel', label: 'Mood x Rating' },
    { id: 'mood-axes-panel', label: 'Mood Axes' },
    { id: 'polarity-panel', label: 'Mood Polarity' },
    { id: 'v2features-panel', label: 'v2 Features' },
  ]},
  { label: 'Meta', items: [
    { id: 'taste-world-panel', label: 'Taste vs World' },
    { id: 'albums-panel', label: 'Albums' },
    { id: 'history-panel', label: 'History' },
    { id: 'feature-confidence-panel', label: 'Feature Confidence' },
    { id: 'data-quality-panel', label: 'Data Quality' },
  ]},
];

export default function Navigation({ showSections = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !e.target.closest('.page-menu') && !e.target.closest('.hamburger-btn')) {
        setMenuOpen(false);
      }
      if (dropdownOpen && !e.target.closest('.nav-search-container')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen, dropdownOpen]);

  const handleNavClick = (e, itemId) => {
    if (e) e.preventDefault();
    setDropdownOpen(false);
    const element = document.getElementById(itemId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
        <div className="nav-search-container">
          <input
            className="nav-search"
            type="search"
            placeholder="Search panels..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setDropdownOpen(true)}
          />
          {dropdownOpen && (
            <div className="nav-dropdown">
              {SECTIONS.map(section => {
                const filtered = section.items.filter(i =>
                  !search || i.label.toLowerCase().includes(search.toLowerCase())
                );
                if (!filtered.length) return null;
                return (
                  <div key={`section-${section.label}`} className="dropdown-section">
                    <div className="dropdown-section-label">{section.label}</div>
                    {filtered.map(item => (
                      <button
                        key={item.id}
                        className="dropdown-item"
                        onClick={() => handleNavClick(null, item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
