import { useState } from 'react'
import { api } from '../../api.js'
import { auth } from '../../auth.js'

export default function AuthForm({ onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setErr(null); setBusy(true)
    try {
      const fn = mode === 'login' ? api.login : api.register
      const { access_token, user } = await fn(username.trim(), password)
      auth.setSession(access_token, user)
      if (onSuccess) onSuccess(user)
    } catch (e) {
      setErr(e.message || 'Authentication failed')
    } finally { setBusy(false) }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => { setMode('login'); setErr(null) }}
        >
          Log in
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => { setMode('register'); setErr(null) }}
        >
          Register
        </button>
      </div>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        minLength={3}
        maxLength={30}
        required
      />
      <input
        type="password"
        placeholder="Password (min 6 chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        minLength={6}
        maxLength={128}
        required
      />
      {err && <div className="err">{err}</div>}
      <button type="submit" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
      </button>
      <small style={{ color: 'var(--text-muted)' }}>
        {mode === 'register'
          ? '3 to 30 characters. Letters, numbers, and underscores only.'
          : 'New here? Use the Register tab above.'}
      </small>
    </form>
  )
}
