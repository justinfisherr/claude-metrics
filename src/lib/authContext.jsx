import { createContext, useContext, useState, useRef, useCallback } from 'react'
import { isAuthed, unlock } from './auth'
import PasswordGate from '../components/PasswordGate'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(isAuthed())
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const resolver = useRef(null)

  const ensureAuthed = useCallback(() => {
    if (isAuthed()) { setAuthed(true); return Promise.resolve(true) }
    setError('')
    setOpen(true)
    return new Promise((resolve) => { resolver.current = resolve })
  }, [])

  const submit = useCallback(async (pw) => {
    try {
      await unlock(pw)
      setAuthed(true)
      setOpen(false)
      resolver.current?.(true)
      resolver.current = null
    } catch {
      setError('Wrong password — try again.')
    }
  }, [])

  const cancel = useCallback(() => {
    setOpen(false)
    resolver.current?.(false)
    resolver.current = null
  }, [])

  return (
    <AuthContext.Provider value={{ authed, ensureAuthed }}>
      {children}
      {open && <PasswordGate error={error} onSubmit={submit} onCancel={cancel} />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
