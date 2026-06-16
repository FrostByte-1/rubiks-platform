const STORAGE_KEY = 'cube_session'

export const auth = {
  getToken() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try { return JSON.parse(raw).access_token } catch { return null }
  },
  getUser() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try { return JSON.parse(raw).user } catch { return null }
  },
  setSession(access_token, user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ access_token, user }))
    window.dispatchEvent(new Event('cube-auth-change'))
  },
  logout() {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event('cube-auth-change'))
  },
  onChange(cb) {
    window.addEventListener('cube-auth-change', cb)
    return () => window.removeEventListener('cube-auth-change', cb)
  },
}
