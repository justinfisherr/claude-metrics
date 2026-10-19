import { useCallback, useEffect, useRef, useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { useAuth } from '../../lib/authContext';
import { authHeaders } from '../../lib/auth';

const API = 'https://jazz-score-api.vercel.app';

const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);

function statusLabel(run) {
  if (!run) return 'No training runs yet';
  if (ACTIVE.has(run.status)) return run.status === 'queued' ? 'Queued' : 'Training now';
  if (run.status === 'completed' && run.conclusion === 'success') return 'Last run succeeded';
  if (run.status === 'completed' && run.conclusion === 'failure') return 'Last run failed';
  if (run.status === 'completed') return `Last run ${run.conclusion || 'finished'}`;
  return run.status || 'Unknown';
}

export default function TrainModel() {
  const { ensureAuthed } = useAuth();
  const [run, setRun] = useState(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [major, setMajor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/train`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setRun(body.run);
      return body.run;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, []);

  useEffect(() => {
    loadStatus();
    return () => clearInterval(pollRef.current);
  }, [loadStatus]);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!run || !ACTIVE.has(run.status)) return;
    pollRef.current = setInterval(async () => {
      const next = await loadStatus();
      if (next && next.status === 'completed') {
        clearInterval(pollRef.current);
        setMessage(next.conclusion === 'success' ? 'Training and deploys finished. Reload to see the new model.' : 'The run finished with a failure — open the run log for details.');
      }
    }, 6000);
    return () => clearInterval(pollRef.current);
  }, [run, loadStatus]);

  const start = async () => {
    if (!(await ensureAuthed())) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API}/api/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: name.trim(), notes: notes.trim(), major }),
      });
      const body = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(body.error || `HTTP ${res.status}`);
      setRun(body.run || null);
      if (res.status === 409) setMessage('A training run is already in progress.');
      else setMessage('Training queued. This folds pending reviews, retrains, and redeploys both apps.');
      setName('');
      setNotes('');
      setMajor(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const active = run && ACTIVE.has(run.status);
  const done = run && run.status === 'completed';

  return (
    <Panel id="train-panel" span={12}>
      <PanelHeader title="Model Release" note="Train from the latest ratings and ship it to both apps" />
      <p className="panel-insight">
        This folds pending reviews into the dataset, pulls the live ratings, retrains the model, then deploys the
        dashboard and the scoring API. One run takes a few minutes.
      </p>

      <div className="train-grid">
        <label className="train-field">
          <span>Release name <em>optional</em></span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Raichu" disabled={active || busy} />
        </label>
        <label className="train-field">
          <span>Notes <em>optional</em></span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this release" disabled={active || busy} />
        </label>
        <label className="train-check">
          <input type="checkbox" checked={major} onChange={(e) => setMajor(e.target.checked)} disabled={active || busy} />
          <span>Major release (snapshot this version)</span>
        </label>
        <button className="train-btn" onClick={start} disabled={active || busy}>
          {busy ? 'Starting…' : active ? 'Training in progress…' : 'Train new model'}
        </button>
      </div>

      <div className="train-status">
        <span className={`train-dot${active ? ' active' : done && run.conclusion === 'success' ? ' ok' : done ? ' bad' : ''}`} aria-hidden="true" />
        <span>{statusLabel(run)}</span>
        {run?.url ? <a href={run.url} target="_blank" rel="noopener noreferrer">Open run log</a> : null}
        {done && run.conclusion === 'success' ? (
          <button className="train-reload" onClick={() => window.location.reload()}>Reload dashboard</button>
        ) : null}
      </div>

      {message ? <p className="train-msg">{message}</p> : null}
      {error ? <p className="search-error">{error}</p> : null}
    </Panel>
  );
}
