import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_THEME, THEMES } from './themes.js'

const ThemeCtx = createContext({ theme: DEFAULT_THEME, setTheme: () => {} })

const STORAGE_KEY = 'cube_theme'

function applyTheme(themeKey) {
  const t = THEMES[themeKey] || THEMES[DEFAULT_THEME]
  const root = document.documentElement
  for (const [k, v] of Object.entries(t.vars)) {
    root.style.setProperty(k, v)
  }
  root.setAttribute('data-theme', themeKey)
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
  })

  useEffect(() => { applyTheme(theme) }, [theme])

  const setTheme = useCallback((next) => {
    if (!THEMES[next]) return
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme() { return useContext(ThemeCtx) }
