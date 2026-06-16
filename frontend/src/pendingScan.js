const KEY = 'cube_pending_scan'

export function setPendingScan(state54) {
  try { sessionStorage.setItem(KEY, state54) } catch (_) {}
}

export function takePendingScan() {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v) {
      sessionStorage.removeItem(KEY)
      return v
    }
  } catch (_) {}
  return null
}

export function hasPendingScan() {
  try { return !!sessionStorage.getItem(KEY) } catch (_) { return false }
}
