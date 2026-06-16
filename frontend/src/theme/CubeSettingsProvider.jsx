import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'cube_settings'

export const DEFAULT_FACE_COLORS = {
  U: '#ffffff',
  D: '#ffd500',
  F: '#009b48',
  B: '#0046ad',
  R: '#b71234',
  L: '#ff5800',
}

const DEFAULT_SETTINGS = {
  faceColors: DEFAULT_FACE_COLORS,
  cubeStyle: 'realistic',
  bevelRadius: 0.08,
  bevelSmoothness: 4,
  showBackground: true,
}

const CubeSettingsCtx = createContext({
  settings: DEFAULT_SETTINGS,
  setFaceColor: () => {},
  setCubeStyle: () => {},
  setBevelRadius: () => {},
  setShowBackground: () => {},
  resetColors: () => {},
})

export function CubeSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return { ...DEFAULT_SETTINGS, ...parsed,
          faceColors: { ...DEFAULT_FACE_COLORS, ...(parsed.faceColors || {}) } }
      }
    } catch (_) {}
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const setFaceColor = useCallback((face, color) => {
    setSettings((s) => ({ ...s, faceColors: { ...s.faceColors, [face]: color } }))
  }, [])

  const setCubeStyle = useCallback((cubeStyle) => {
    setSettings((s) => ({ ...s, cubeStyle }))
  }, [])

  const setBevelRadius = useCallback((bevelRadius) => {
    setSettings((s) => ({ ...s, bevelRadius }))
  }, [])

  const setShowBackground = useCallback((showBackground) => {
    setSettings((s) => ({ ...s, showBackground }))
  }, [])

  const resetColors = useCallback(() => {
    setSettings((s) => ({ ...s, faceColors: DEFAULT_FACE_COLORS }))
  }, [])

  return (
    <CubeSettingsCtx.Provider value={{
      settings, setFaceColor, setCubeStyle, setBevelRadius, setShowBackground, resetColors,
    }}>
      {children}
    </CubeSettingsCtx.Provider>
  )
}

export function useCubeSettings() { return useContext(CubeSettingsCtx) }
