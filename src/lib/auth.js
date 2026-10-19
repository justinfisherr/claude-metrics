export const AUTH_API = 'https://jazz-score-api.vercel.app'

export function isAuthed() {
  try { return localStorage.getItem('jazz_auth') === '1' } catch { return false }
}
export function authHeaders() {
  try { return { 'x-app-password': localStorage.getItem('jazz_pw') || '' } } catch { return {} }
}
export async function unlock(password) {
  const res = await fetch(`${AUTH_API}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error('wrong password')
  try { localStorage.setItem('jazz_pw', password); localStorage.setItem('jazz_auth', '1') } catch {}
}
