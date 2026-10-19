import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeaders } from '../lib/auth';

const API = 'https://jazz-score-api.vercel.app';
let sdkPromise = null;
let tokenCache = { value: null, expiresAt: 0 };

function loadSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
  if (window.Spotify) return Promise.resolve(window.Spotify);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Spotify player timed out')), 15000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timer);
      resolve(window.Spotify);
    };
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Could not load the Spotify player'));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

async function getToken(force = false) {
  if (!force && tokenCache.value && tokenCache.expiresAt > Date.now() + 60000) return tokenCache.value;
  const res = await fetch(`${API}/api/spotify-playback-token`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Spotify playback is not connected. Connect Spotify in Transcribe first.');
  tokenCache = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return tokenCache.value;
}

export default function useSpotifyPlayer({ enabled = true } = {}) {
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [volume, setVolumeState] = useState(0.8);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      setDeviceId(null);
      setError('');
      return;
    }
    getToken().catch((e) => setError(e.message));
    let alive = true;
    let player = null;
    loadSdk()
      .then((Spotify) => {
        if (!alive) return;
        player = new Spotify.Player({
          name: 'Jazz Taste AI',
          getOAuthToken: (cb) => { getToken().then(cb).catch(() => {}); },
          volume: 0.8,
        });
        player.addListener('ready', ({ device_id }) => {
          if (!alive) return;
          setReady(true);
          setDeviceId(device_id);
          setError('');
        });
        player.addListener('not_ready', () => { if (alive) setReady(false); });
        player.addListener('player_state_changed', (s) => { if (alive && s) setState(s); });
        player.addListener('authentication_error', () => { if (alive) setError('Spotify authorization expired. Reconnect Spotify in Transcribe.'); });
        player.addListener('account_error', () => { if (alive) setError('Spotify Premium is required for in-page playback.'); });
        player.addListener('initialization_error', () => { if (alive) setError('This browser cannot start the Spotify player.'); });
        player.addListener('playback_error', () => { if (alive) setError('Spotify playback failed. Try again.'); });
        playerRef.current = player;
        player.connect();
      })
      .catch((e) => { if (alive) setError(e.message); });

    return () => {
      alive = false;
      try { player?.disconnect(); } catch {}
      playerRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!state || state.paused) return;
    const timer = setInterval(async () => {
      try {
        const s = await playerRef.current?.getCurrentState();
        if (s) setState(s);
      } catch {}
    }, 700);
    return () => clearInterval(timer);
  }, [state]);

  const activate = useCallback(async () => {
    try { await playerRef.current?.activateElement?.(); } catch {}
  }, []);

  const playAll = useCallback(async (uris) => {
    if (!deviceId) throw new Error('The Spotify player is still connecting.');
    await activate();
    let token = await getToken();
    const call = (accessToken) => fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ uris }),
    });
    let res = await call(token);
    if (res.status === 401) {
      token = await getToken(true);
      res = await call(token);
    }
    if (!res.ok && res.status !== 202 && res.status !== 204) {
      throw new Error(`Spotify could not start playback (${res.status}).`);
    }
  }, [deviceId, activate]);

  const toggle = useCallback(() => playerRef.current?.togglePlay(), []);
  const next = useCallback(() => playerRef.current?.nextTrack(), []);
  const previous = useCallback(() => playerRef.current?.previousTrack(), []);
  const seek = useCallback((ms) => playerRef.current?.seek(ms), []);
  const setVolume = useCallback((value) => {
    setVolumeState(value);
    playerRef.current?.setVolume(value);
  }, []);

  const track = state?.track_window?.current_track || null;
  return {
    ready, deviceId, error, state, track,
    paused: state?.paused ?? true,
    position: state?.position || 0,
    duration: track?.duration_ms || 0,
    volume,
    playAll, toggle, next, previous, seek, setVolume,
  };
}
