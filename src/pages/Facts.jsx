import { useState, useEffect, useCallback, useRef } from 'react';
import Navigation from '../components/shared/Navigation';
import '../styles/facts.css';

const STORAGE_KEY = 'jazzFactsRead';

export default function Facts() {
  const [facts, setFacts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [read, setRead] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [error, setError] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  const pickRandom = useCallback((list) => {
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }, []);

  const showFact = useCallback((list) => {
    const fact = pickRandom(list);
    if (!fact) return;
    setCurrent(fact);
    setAnimKey(k => k + 1);
    setRead(prev => {
      const next = new Set(prev);
      next.add(fact.id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [pickRandom]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}jazz-facts.json`)
      .then(r => r.json())
      .then(data => {
        setFacts(data.facts);
        showFact(data.facts);
      })
      .catch(err => {
        console.error('Error loading facts:', err);
        setError('Could not load facts. Make sure jazz-facts.json is deployed.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextFact = () => showFact(facts);

  // Swipe left (or right) to advance to the next fact on touch devices.
  const touchStart = useRef(null);
  const onTouchStart = (e) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) nextFact();
  };

  const resetCache = () => {
    if (!window.confirm("Clear all read facts? You'll see stats reset to 0.")) return;
    setRead(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    showFact(facts);
  };

  const alreadyRead = current ? read.has(current.id) : false;

  return (
    <>
      <Navigation showSections={false} />
      <div className="facts-wrapper">
        <div className="facts-header">
          <h1>Jazz Facts</h1>
          <p>Random wisdom about jazz's greatest musicians</p>
        </div>

        {error ? (
          <div className="fact-card"><p className="fact-text">{error}</p></div>
        ) : (
          <div className="fact-card" key={animKey} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div>
              {current && current.image && (
                <img className="fact-image" src={current.image} alt={current.song || current.title} loading="lazy" />
              )}
              {current && current.song && (
                <div className="fact-song">{current.song}{current.artist ? ` · ${current.artist}` : ''}</div>
              )}
              <div className="fact-title">{current ? current.title : 'Loading…'}</div>
              <div className="fact-text">{current ? current.fact : 'Discovering a random jazz fact…'}</div>
              {current && (
                <span className="read-indicator" style={{ color: alreadyRead ? '#888' : '#ffd700' }}>
                  {alreadyRead ? '✓ Already read' : 'New fact'}
                </span>
              )}
            </div>
            {current && (
              <div className="fact-counter">
                <strong>Fact {current.id}</strong> of {facts.length}
              </div>
            )}
          </div>
        )}

        <p className="swipe-hint">Swipe left for the next fact</p>

        <div className="facts-stats">
          <p>
            You've read <span className="stats-highlight">{read.size}</span> of{' '}
            <span className="stats-highlight">{facts.length}</span> facts
          </p>
        </div>

        <div className="facts-buttons">
          <button className="btn-next" onClick={nextFact}>Next Fact →</button>
          <button className="btn-reset" onClick={resetCache}>Reset</button>
        </div>
      </div>
    </>
  );
}
