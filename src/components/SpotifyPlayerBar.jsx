import { useState } from 'react';

const PlayIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
const PrevIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM19 5v14l-9-7z" /></svg>;
const NextIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM5 5v14l9-7z" /></svg>;

function fmt(ms) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function SpotifyPlayerBar({ player }) {
  const [drag, setDrag] = useState(null);

  if (player.error) {
    return (
      <div className="spot-player spot-player-error">
        <span>{player.error}</span>
      </div>
    );
  }
  if (!player.track) return null;

  const track = player.track;
  const shown = drag != null ? drag : player.position;
  const duration = player.duration || 1;
  const artist = (track?.artists || []).map((a) => a.name).join(', ');
  const image = track?.album?.images?.[0]?.url;

  return (
    <div className="spot-player">
      <div className="spot-now">
        <div className="spot-art">{image ? <img src={image} alt="" /> : <span>♪</span>}</div>
        <div className="spot-now-text">
          <strong>{track?.name || 'Connecting to Spotify…'}</strong>
          <span>{artist || (player.ready ? 'Player ready' : 'Waiting for Spotify')}</span>
        </div>
      </div>

      <div className="spot-transport">
        <button onClick={player.previous} aria-label="Previous track" title="Previous"><PrevIcon /></button>
        <button className="spot-play" onClick={player.toggle} aria-label={player.paused ? 'Play' : 'Pause'}>
          {player.paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button onClick={player.next} aria-label="Next track" title="Next"><NextIcon /></button>
      </div>

      <div className="spot-scrub">
        <span className="mono">{fmt(shown)}</span>
        <input
          type="range"
          min="0"
          max={duration}
          step="500"
          value={Math.min(shown, duration)}
          onInput={(e) => setDrag(Number(e.target.value))}
          onPointerUp={(e) => { player.seek(Number(e.target.value)); setDrag(null); }}
          onKeyUp={(e) => { player.seek(Number(e.target.value)); setDrag(null); }}
          aria-label="Seek"
        />
        <span className="mono">{fmt(duration)}</span>
      </div>

      <div className="spot-volume">
        <span aria-hidden="true">Vol</span>
        <input type="range" min="0" max="1" step="0.05" value={player.volume} onChange={(e) => player.setVolume(Number(e.target.value))} aria-label="Volume" />
      </div>
    </div>
  );
}
