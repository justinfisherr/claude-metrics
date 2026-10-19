import { useState } from 'react'

export default function PasswordGate({ error, onSubmit, onCancel }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!pw || busy) return
    setBusy(true)
    await onSubmit(pw)
    setBusy(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={onCancel}
    >
      <div
        style={{ background: 'var(--panel, #0b1a30)', border: '1px solid var(--border, #1c2f4a)', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', color: 'var(--text, #d7e6f7)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 6px' }}>Unlock</h3>
        <p style={{ color: 'var(--muted, #87a2c3)', fontSize: 14, margin: '0 0 16px' }}>Enter the password to add or change anything.</p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            style={{ background: '#0a1628', border: '1px solid #1c2f4a', borderRadius: 8, padding: '12px 14px', color: '#d7e6f7', fontSize: 16, outline: 'none' }}
          />
          {error && <div style={{ color: 'var(--bad, #ff6b6b)', fontSize: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={busy || !pw} style={{ background: 'var(--accent, #ffc144)', color: '#04101f', border: 0, borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', opacity: (busy || !pw) ? 0.6 : 1 }}>
              Unlock
            </button>
            <button type="button" onClick={onCancel} style={{ background: 'transparent', border: '1px solid #1c2f4a', color: '#87a2c3', borderRadius: 8, padding: '10px 18px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
