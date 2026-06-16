/**
 * RaceArenaPage.jsx  (bug-fix v2 — 2026-06-16)
 *
 * Split-screen Human vs AI race page.
 *
 * Fixes vs v1:
 *  - Winner resolution uses the same idle-check guards as useAiRace, so "AI wins"
 *    only fires after the last move has finished animating.
 *  - AI win path now calls setPhase('finished') immediately (no provisional state).
 *  - Defensive API helpers (cubeAnimating / cubeQueueLen / cubeStateStr) handle
 *    both getter-function and plain-getter styles of useCubeState.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Cube3D from '../components/cube/Cube3D.jsx'
import { useCubeState } from '../components/cube/useCubeState.js'
import Timer, { formatTime } from '../components/arena/Timer.jsx'
import { useAiRace } from '../components/arena/useAiRace.js'
import { api } from '../api.js'

const KEY_MAP = { KeyU: 'U', KeyR: 'R', KeyF: 'F', KeyD: 'D', KeyL: 'L', KeyB: 'B' }
const SOLVED_STR = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

// ---------------------------------------------------------------------------
// Defensive cube API helpers (identical to those in useAiRace.js)
// ---------------------------------------------------------------------------
function cubeAnimating(cube) {
  if (typeof cube.getAnim === 'function') return cube.getAnim() != null
  return !!cube.animating
}
function cubeQueueLen(cube) {
  if (typeof cube.getQueueLength === 'function') return cube.getQueueLength()
  return cube.queueLength ?? 0
}
function cubeStateStr(cube) {
  if (typeof cube.getState === 'function') return cube.getState()
  if (typeof cube.getCurrentState === 'function') return cube.getCurrentState()
  return null
}

export default function RaceArenaPage() {
  const human  = useCubeState()
  const ai     = useCubeState()
  const aiRace = useAiRace(ai)

  const [phase,         setPhase]         = useState('idle')  // idle | ready | racing | finished
  const [scramble,      setScramble]      = useState([])
  const [humanStart,    setHumanStart]    = useState(null)
  const [humanFinishMs, setHumanFinishMs] = useState(null)
  const [winner,        setWinner]        = useState(null)    // 'human' | 'ai' | null
  const humanDoneRef = useRef(false)

  // -------------------------------------------------------------------------
  // Human keyboard handler
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'racing') return
    const handler = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      const face = KEY_MAP[e.code]
      if (!face) return
      human.queueMove(face + (e.shiftKey ? "'" : ''))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, human])

  // -------------------------------------------------------------------------
  // Detect a genuine human solve: cube idle AND in solved state
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'racing' || humanDoneRef.current) return
    const id = setInterval(() => {
      if (cubeAnimating(human) || cubeQueueLen(human) > 0) return
      if (cubeStateStr(human) === SOLVED_STR) {
        humanDoneRef.current = true
        setHumanFinishMs(Date.now() - humanStart)
      }
    }, 120)
    return () => clearInterval(id)
  }, [phase, human, humanStart])

  // -------------------------------------------------------------------------
  // Resolve winner once either side is truly finished.
  // aiRace.status === 'done' only fires after the last move has finished
  // animating (guaranteed by the new useAiRace tick logic).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'racing') return
    const humanDone = humanFinishMs != null
    const aiDone    = aiRace.status === 'done'
    if (!humanDone && !aiDone) return

    if (humanDone && aiDone) {
      setWinner(humanFinishMs <= (aiRace.finishMs ?? Infinity) ? 'human' : 'ai')
      setPhase('finished')
    } else if (humanDone) {
      setWinner('human')
      setPhase('finished')
    } else {
      // aiDone — AI won outright
      setWinner('ai')
      setPhase('finished')
    }
  }, [phase, humanFinishMs, aiRace.status, aiRace.finishMs])

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------
  const setupRace = useCallback(async () => {
    const { moves } = await api.scramble()
    human.reset()
    ai.reset()
    aiRace.reset()
    human.applyMovesInstant(moves)
    ai.applyMovesInstant(moves)
    setScramble(moves)
    setHumanFinishMs(null)
    setWinner(null)
    humanDoneRef.current = false
    setPhase('ready')
  }, [human, ai, aiRace])

  const startRace = useCallback(() => {
    const state = cubeStateStr(ai)
    setHumanStart(Date.now())
    setPhase('racing')
    aiRace.start(state)
  }, [ai, aiRace])

  const resetAll = useCallback(() => {
    human.reset()
    ai.reset()
    aiRace.reset()
    setScramble([])
    setHumanFinishMs(null)
    setWinner(null)
    humanDoneRef.current = false
    setPhase('idle')
  }, [human, ai, aiRace])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------


  return (
    <div>
      <h2>🤖 Human vs Machine Race</h2>

      {/* ---- Controls bar ---- */}
      <div className="controls" style={{ marginBottom: 16 }}>
        {phase === 'idle' && (
          <button id="race-get-scramble" className="primary" onClick={setupRace}>
            🎲 Get scramble
          </button>
        )}
        {phase === 'ready' && (
          <>
            <button id="race-start" className="primary" onClick={startRace}>🏁 Start race</button>
            <button id="race-cancel" onClick={resetAll}>Cancel</button>
          </>
        )}
        {(phase === 'racing' || phase === 'finished') && (
          <button id="race-new" onClick={resetAll}>🔄 New race</button>
        )}
        {scramble.length > 0 && (
          <span style={{
            alignSelf: 'center', marginLeft: 8,
            fontFamily: 'var(--font-mono, monospace)', fontSize: 13,
          }}>
            Scramble:&nbsp;
            <span className="move-list" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
              {scramble.map((m, i) => <span key={i}>{m}</span>)}
            </span>
          </span>
        )}
      </div>

      {/* ---- Winner banner ---- */}
      {winner && (
        <div className="card" style={{
          borderColor: 'var(--accent)', marginBottom: 20,
          textAlign: 'center', padding: '12px 24px',
        }}>
          <h3 style={{ margin: 0, fontSize: 22 }}>
            {winner === 'human' ? '🎉 You win!' : '🤖 Machine wins!'}
          </h3>
        </div>
      )}

      {/* ---- Split-screen cubes ---- */}
      <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>

        {/* ===== HUMAN SIDE ===== */}
        <div className="col">
          <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
            <h3 style={{ marginBottom: 8 }}>👤 You</h3>
            <Timer
              running={phase === 'racing' && humanFinishMs == null}
              startTime={humanStart}
              currentTimeMs={humanFinishMs}
            />
            {humanFinishMs != null && (
              <div style={{ color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                ✅ Solved in {formatTime(humanFinishMs)}
              </div>
            )}
          </div>

          <Cube3D cubeState={human} />

          {phase === 'racing' && humanFinishMs == null && (
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              Solve with <b>U R F D L B</b> — <b>Shift</b> for counter-clockwise
            </p>
          )}
          {phase === 'ready' && (
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              Both cubes share the same scramble. Press <b>Start race</b> when ready.
            </p>
          )}
        </div>

        {/* ===== AI SIDE ===== */}
        <div className="col">
          <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
            <h3 style={{ marginBottom: 8 }}>🤖 Machine</h3>
            <Timer
              running={aiRace.status === 'racing'}
              startTime={phase === 'racing' ? humanStart : null}
              currentTimeMs={aiRace.status === 'done' ? aiRace.finishMs : null}
            />
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {aiRace.status === 'fetching' && 'Planning…'}
              {aiRace.status === 'racing' && (
                <>
                  Move {aiRace.moveIndex} / {aiRace.totalMoves}
                  <span style={{
                    marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 11,
                    background: aiRace.inNeuralPhase ? 'var(--accent-grad)' : 'var(--card-bg)',
                    border: aiRace.inNeuralPhase ? 'none' : '1px solid var(--card-border)',
                    color: aiRace.inNeuralPhase ? '#fff' : 'var(--text-muted)',
                  }}>
                    {aiRace.phaseLabel === 'thinking' ? '🧠 solving itself' : '⚙ computing'}
                  </span>
                </>
              )}
              {aiRace.status === 'done' && aiRace.finishMs != null && `Solved in ${formatTime(aiRace.finishMs)}`}
              {aiRace.status === 'error' && <span style={{ color: 'var(--danger)' }}>{aiRace.error}</span>}
              {aiRace.status === 'done' && aiRace.solverPath && (
                <span style={{ marginLeft: 8, opacity: 0.7 }}>
                  ({aiRace.solverPath === 'neural' ? 'solved by neural net'
                    : aiRace.solverPath === 'neural_then_oracle' ? `neural ${aiRace.neuralLen} moves, then oracle`
                    : 'oracle'})
                </span>
              )}
            </div>
          </div>

          <Cube3D cubeState={ai} />
        </div>
      </div>
    </div>
  )
}
