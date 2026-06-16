import { useEffect } from 'react'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import { useCubeSettings, DEFAULT_FACE_COLORS } from '../../theme/CubeSettingsProvider.jsx'
import { THEMES, THEME_KEYS } from '../../theme/themes.js'

const FACE_LABEL = { U: 'Up (White)', D: 'Down (Yellow)', F: 'Front (Green)', B: 'Back (Blue)', R: 'Right (Red)', L: 'Left (Orange)' }
const CUBE_STYLES = [
  { key: 'realistic', label: 'Realistic (glossy)' },
  { key: 'matte',     label: 'Matte / Modern' },
  { key: 'glass',     label: 'Glass / Holographic' },
  { key: 'classic',   label: 'Classic (flat stickers)' },
]

export default function SettingsPanel({ open, onClose }) {
  const { theme, setTheme } = useTheme()
  const { settings, setFaceColor, setCubeStyle, setBevelRadius, setShowBackground, resetColors } = useCubeSettings()

  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <aside className="settings-panel" role="dialog" aria-label="Settings">
        <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        <h3>⚙️ Settings</h3>

        <h4>🎨 Theme</h4>
        <div className="theme-row">
          {THEME_KEYS.map((k) => (
            <button
              key={k}
              className={k === theme ? 'active' : ''}
              onClick={() => setTheme(k)}
            >
              <div style={{ fontWeight: 700 }}>{THEMES[k].label}</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{THEMES[k].description}</div>
            </button>
          ))}
        </div>

        <h4>✨ Background animation</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={settings.showBackground}
            onChange={(e) => setShowBackground(e.target.checked)}
            style={{ width: 'auto', padding: 0 }}
          />
          Show particles / petals
        </label>

        <h4>🧊 Cube style</h4>
        <select
          value={settings.cubeStyle}
          onChange={(e) => setCubeStyle(e.target.value)}
          style={{ width: '100%' }}
        >
          {CUBE_STYLES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        <h4>📐 Bevel (rounded edges)</h4>
        <input
          type="range"
          min="0" max="0.18" step="0.01"
          value={settings.bevelRadius}
          onChange={(e) => setBevelRadius(parseFloat(e.target.value))}
          style={{ width: '100%', marginBottom: 4 }}
        />
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {settings.bevelRadius === 0 ? 'Sharp edges' : `${Math.round(settings.bevelRadius * 100 / 0.18)}% rounded`}
        </div>

        <h4>🎲 Face colors</h4>
        {['U', 'D', 'F', 'B', 'R', 'L'].map((f) => (
          <div key={f} className="face-color-row">
            <label>{FACE_LABEL[f]}</label>
            <input
              type="color"
              value={settings.faceColors[f]}
              onChange={(e) => setFaceColor(f, e.target.value)}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {settings.faceColors[f]}
            </span>
          </div>
        ))}
        <button onClick={resetColors} style={{ width: '100%', marginTop: 10 }}>
          ↺ Reset to standard colors
        </button>
      </aside>
    </>
  )
}
