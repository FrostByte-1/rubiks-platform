import { auth } from './auth.js'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function jfetch(path, opts = {}, requireAuth = false) {
  const headers = { ...(opts.headers || {}) }
  const token = auth.getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (requireAuth && !token) throw new Error('Please sign in first')
  const res = await fetch(BASE + path, { ...opts, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  register: (username, password) =>
    jfetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),

  login: async (username, password) => {
    const body = new URLSearchParams()
    body.append('username', username)
    body.append('password', password)
    const res = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return res.json()
  },

  me: () => jfetch('/me', {}, true),

  scramble: () => jfetch('/scramble'),

  solveAiRace: (state) =>
    jfetch('/race/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }),

  solveFromState: (state) =>
    jfetch(`/solve_state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }),

  solveFromFaces: (faces) =>
    jfetch(`/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faces }),
    }),

  detectFace: async (face, file) => {
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch(`${BASE}/detect?face=${face}`, { method: 'POST', body: fd })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  submitTime: (seconds, scramble) =>
    jfetch(
      '/times',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds, scramble }),
      },
      true,
    ),

  leaderboard: () => jfetch('/leaderboard?limit=20'),
}