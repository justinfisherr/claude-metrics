import { useState, useEffect } from 'react';
import Navigation from '../components/shared/Navigation';
import '../styles/memories.css';

export default function Memories() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetch('training-data.json')
      .then(r => r.json())
      .then(data => {
        const withNotes = data.filter(t => t.notes).sort((a, b) => {
          if (sortBy === 'date') {
            return new Date(b.date_added || 0) - new Date(a.date_added || 0);
          } else if (sortBy === 'rating') {
            return b.rating - a.rating;
          }
          return 0;
        });
        setTracks(withNotes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sortBy]);

  if (loading) return <div className="memories-container"><p>Loading...</p></div>;

  return (
    <>
      <Navigation showSections={false} />
      <div className="memories-container">
        <div className="memories-header">
          <h1>Listening Memories</h1>
          <p className="memories-subtitle">Personal reflections on tracks that stood out</p>
          <div className="memories-controls">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
              <option value="date">Most Recent</option>
              <option value="rating">Highest Rated</option>
            </select>
            <span className="track-count">{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="memories-list">
          {tracks.length === 0 ? (
            <div className="empty-state">
              <p>No memories yet. Rate a track and add a comment to start building your listening diary.</p>
            </div>
          ) : (
            tracks.map((track, idx) => (
              <div key={track.spotify_id || idx} className="memory-card">
                <div className="memory-rank">#{idx + 1}</div>
                <div className="memory-header-info">
                  <h3 className="memory-title">{track.title}</h3>
                  <p className="memory-artist">{track.artist}</p>
                  {track.album && <p className="memory-album">{track.album}</p>}
                  <div className="memory-meta">
                    <span className="memory-rating">★ {track.rating}</span>
                    {track.year && <span className="memory-year">{track.year}</span>}
                    {track.date_added && <span className="memory-date">{new Date(track.date_added).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                </div>
                <div className="memory-content">
                  <p className="memory-comment">{track.notes}</p>
                  {track.audio_features && (
                    <div className="memory-features">
                      <span className="feature-badge">
                        Danceability: {track.audio_features.danceability !== undefined ? (track.audio_features.danceability * 100).toFixed(0) : 'N.A.'}
                      </span>
                      <span className="feature-badge">
                        Energy: {track.audio_features.spotify_energy !== undefined ? (track.audio_features.spotify_energy * 100).toFixed(0) : 'N.A.'}
                      </span>
                      <span className="feature-badge">
                        Acousticness: {track.audio_features.acousticness !== undefined ? (track.audio_features.acousticness * 100).toFixed(0) : 'N.A.'}
                      </span>
                      <span className="feature-badge">
                        Tempo: {track.audio_features.tempo_bpm ? `${track.audio_features.tempo_bpm} BPM` : 'N.A.'}
                      </span>
                      <span className="feature-badge">
                        Instrumentalness: {track.audio_features.instrumentalness !== undefined ? (track.audio_features.instrumentalness * 100).toFixed(0) : 'N.A.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
