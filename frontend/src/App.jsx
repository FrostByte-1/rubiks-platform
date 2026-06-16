import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import ScanSolvePage from './pages/ScanSolvePage.jsx'
import VirtualCubePage from './pages/VirtualCubePage.jsx'
import ArenaPage from './pages/ArenaPage.jsx'
import LearnPage from './pages/LearnPage.jsx'
import RaceArenaPage from './pages/RaceArenaPage.jsx'
import UserBadge from './components/auth/UserBadge.jsx'
import SettingsPanel from './components/settings/SettingsPanel.jsx'
import AnimatedBackground from './components/background/AnimatedBackground.jsx'
import './App.css'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="app">
      <AnimatedBackground />
      <nav className="nav">
        <h1>🧊 Cube Platform</h1>
        <NavLink to="/" end>Virtual Cube</NavLink>
        <NavLink to="/scan">Scan &amp; Solve</NavLink>
        <NavLink to="/arena">🏟️ Arena</NavLink>
        <NavLink to="/race">🤖 Race Machine</NavLink>
        <NavLink to="/learn">📚 Learn</NavLink>
        <UserBadge />
        <button
          className="settings-gear"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙️
        </button>
      </nav>
      <div className="page">
        <Routes>
          <Route path="/" element={<VirtualCubePage />} />
          <Route path="/scan" element={<ScanSolvePage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/race" element={<RaceArenaPage />} />
        </Routes>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <footer style={{
        textAlign: 'center', padding: '24px 16px', fontSize: 12, color: 'var(--text-muted)',
        borderTop: '1px solid var(--card-border)', marginTop: 32,
      }}>
        Built with 🧊 — solver by Kociemba, 3D by Three.js. Press <kbd style={{
          padding: '1px 6px', borderRadius: 3, border: '1px solid var(--card-border)',
          background: 'var(--card-bg)',
        }}>⚙</kbd> for settings.
      </footer>
    </div>
  )
}