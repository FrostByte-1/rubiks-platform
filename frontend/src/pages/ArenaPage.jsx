import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cube3D from '../components/cube/Cube3D.jsx'
import { useCubeState } from '../components/cube/useCubeState.js'
import Timer, { formatTime } from '../components/arena/Timer.jsx'
import Leaderboard from '../components/arena/Leaderboard.jsx'
import AuthForm from '../components/auth/AuthForm.jsx'
import { api } from '../api.js'
import { auth } from '../auth.js'
import { setPendingScan } from '../pendingScan.js'

const KEY_MAP = { KeyU:'U', KeyR:'R', KeyF:'F', KeyD:'D', KeyL:'L', KeyB:'B' }

export default function ArenaPage() {
  const cube = useCubeState()
  const navigate = useNavigate()
  const [phase, setPhase] = useState('idle')
  const [scramble, setScramble] = useState([])
  const [startTime, setStartTime] = useState(null)
  const [finalMs, setFinalMs] = useState(null)
  const [submitState, setSubmitState] = useState('idle')
  const [submitError, setSubmitError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [user, setUser] = useState(auth.getUser())

  useEffect(() => auth.onChange(() => setUser(auth.getUser())), [])

  useEffect(() => {
    if (phase !== 'solving') return
    const handler = (e) => {
      const face = KEY_MAP[e.code]
      if (!face) return
      cube.queueMove(face + (e.shiftKey ? "'" : ''))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, cube])

  useEffect(() => {
    if (phase !== 'solving') return
    const id = setInterval(() => {
      if (cube.animating != null || cube.queueLength > 0) return
      if (cube.isSolved()) {
        const ms = Date.now() - startTime
        setFinalMs(ms)
        setPhase('done')
      }
    }, 150)
    return () => clearInterval(id)
  }, [phase, cube, startTime])

  const startAttempt = async () => {
    setSubmitState('idle')
    setSubmitError(null)
    setFinalMs(null)
    const { moves } = await api.scramble()
    setScramble(moves)
    cube.reset()
    cube.applyMovesInstant(moves)
    setStartTime(Date.now())
    setPhase('solving')
  }

  const submitTime = async () => {
    if (!user) return
    setSubmitState('busy')
    setSubmitError(null)
    try {
      await api.submitTime(finalMs / 1000, scramble.join(' '))
      setSubmitState('done')
      setRefreshKey(k => k + 1)
    } catch (e) {
      setSubmitState('error')
      setSubmitError(e.message)
    }
  }

  const resetArena = () => {
    cube.reset()
    setPhase('idle')
    setScramble([])
    setFinalMs(null)
    setSubmitState('idle')
    setSubmitError(null)
  }

  const quitAndLearn = () => {
    const state = cube.getState()
    setPendingScan(state)
    navigate('/scan')
  }

  return (
    <div>
      <h2>🏟️ Speedcubing Arena</h2>

      <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>

        <div className="col" style={{ minWidth: 280, maxWidth: 380 }}>

          {scramble.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎲 Scramble
              </div>
              <div className="move-list">
                {scramble.map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            </div>
          )}

          <Timer
            running={phase === 'solving'}
            startTime={startTime}
            currentTimeMs={finalMs}
          />

          <div className="controls" style={{ justifyContent: 'center', marginTop: 8, flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {phase === 'idle' && (
              <button onClick={startAttempt} className="primary" style={{ fontSize: 16, padding: '11px 32px' }}>
                🎲 New Scramble
              </button>
            )}

            {phase === 'solving' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                  Inspect the cube, then press <b>Start timer</b>.
                  Solve with the <b>U R F D L B</b> keys — <b>Shift</b> for counter-clockwise.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={resetArena} style={{ fontSize: 13 }}>↺ Give up</button>
                  <button onClick={quitAndLearn} className="quit-learn-btn" style={{ fontSize: 13 }}>
                    🎓 Quit &amp; Learn
                  </button>
                </div>
              </div>
            )}

            {phase === 'done' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)', textAlign: 'center' }}>
                  🎉 Solved in {formatTime(finalMs)}!
                </div>

                {!user ? (
                  <div className="card" style={{ width: '100%' }}>
                    <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                      Sign in to submit your time to the leaderboard:
                    </p>
                    <AuthForm onSuccess={(u) => setUser(u)} />
                  </div>
                ) : submitState === 'done' ? (
                  <p style={{ color: 'var(--success)' }}>✅ Time submitted!</p>
                ) : (
                  <button
                    onClick={submitTime}
                    disabled={submitState === 'busy'}
                    className="primary"
                    style={{ padding: '9px 28px', fontSize: 15 }}
                  >
                    {submitState === 'busy' ? '⏳ Submitting…' : '📤 Submit time'}
                  </button>
                )}

                {submitState === 'error' && (
                  <p style={{ color: 'var(--danger)', fontSize: 13 }}>{submitError}</p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={resetArena}>🔄 New attempt</button>
                  <button onClick={quitAndLearn} className="quit-learn-btn" style={{ fontSize: 13 }}>
                    🎓 Learn to solve
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col" style={{ flex: '1 1 400px' }}>
          <Cube3D cubeState={cube} />
        </div>

        <div className="col" style={{ minWidth: 260, maxWidth: 340 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>🏆 Leaderboard</h3>
            <Leaderboard refreshKey={refreshKey} currentUser={user} />
          </div>
        </div>

      </div>
    </div>
  )
}