import { useEffect, useRef } from 'react'
import Cube3D from '../components/cube/Cube3D.jsx'
import { useCubeState } from '../components/cube/useCubeState.js'
import { useNeuralSolve } from '../components/cube/useNeuralSolve.js'
import { api } from '../api.js'

const KEY_MAP = {
  KeyU: 'U', KeyR: 'R', KeyF: 'F', KeyD: 'D', KeyL: 'L', KeyB: 'B',
}

const SCRAMBLE_PAUSE_MS = 1400

export default function VirtualCubePage() {
  const cube = useCubeState()
  const neural = useNeuralSolve(cube)
  const busyRef = useRef(false)

  useEffect(() => {
    const handler = (e) => {
      const face = KEY_MAP[e.code]
      if (!face) return
      if (neural.isBusy) neural.abort('aborted')
      cube.queueMove(face + (e.shiftKey ? "'" : ''))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cube, neural])

  const scramble = async () => {
    if (neural.isBusy) neural.abort('aborted')
    if (busyRef.current) return
    busyRef.current = true
    try {
      const { moves } = await api.scramble()
      cube.queueMoves(moves)
    } finally {
      busyRef.current = false
    }
  }

  const solveCurrentState = async () => {
    if (neural.isBusy) neural.abort('aborted')
    if (busyRef.current) return
    busyRef.current = true
    try {
      const state = cube.getState()
      const { moves } = await api.solveFromState(state)
      cube.queueMoves(moves)
    } finally {
      busyRef.current = false
    }
  }

  const scrambleAndSolve = async () => {
    if (neural.isBusy) neural.abort('aborted')
    if (busyRef.current) return
    busyRef.current = true
    try {
      cube.reset()
      const { moves: scrambleMoves } = await api.scramble()
      cube.applyMovesInstant(scrambleMoves)
      await new Promise(r => setTimeout(r, SCRAMBLE_PAUSE_MS))
      const state = cube.getState()
      const { moves: solution } = await api.solveFromState(state)
      cube.queueMoves(solution)
    } finally {
      busyRef.current = false
    }
  }

  const handleReset = () => {
    if (neural.isBusy) neural.abort('aborted')
    cube.reset()
    neural.reset()
  }

  return (
    <div>
      <h2>🧊 Virtual Cube</h2>
      <div style={{
        display: 'inline-flex', gap: 6, marginBottom: 16, flexWrap: 'wrap',
        alignItems: 'center', fontSize: 13, color: 'var(--text-muted)'
      }}>
        <span>Keys:</span>
        {['U', 'R', 'F', 'D', 'L', 'B'].map((k) => (
          <kbd key={k} style={{
            padding: '2px 8px', borderRadius: 4, border: '1px solid var(--card-border)',
            background: 'var(--card-bg)', fontFamily: 'JetBrains Mono, monospace',
          }}>{k}</kbd>
        ))}
        <span style={{ marginLeft: 6 }}>+ <kbd style={{
          padding: '2px 8px', borderRadius: 4, border: '1px solid var(--card-border)',
          background: 'var(--card-bg)', fontFamily: 'JetBrains Mono, monospace',
        }}>Shift</kbd> for counter-clockwise. Drag the cube to rotate the view.</span>
      </div>
      <Cube3D cubeState={cube} />
      <div className="controls">
        <button onClick={handleReset}>↺ Reset</button>
        <button onClick={scramble}>🎲 Scramble</button>
        <button onClick={solveCurrentState} className="primary">✨ Solve current state</button>
        <button onClick={scrambleAndSolve}>🚀 Scramble &amp; Solve (auto demo)</button>
      </div>
      <div className="controls" style={{ marginTop: 12 }}>
        <button
          className="primary"
          onClick={neural.solve}
          disabled={neural.isBusy}
        >
          {neural.status === 'fetching' ? 'Thinking…'
            : neural.status === 'solving' ? 'Solving…'
            : 'Solve (Neural Net)'}
        </button>

        {neural.status === 'solving' && (
          <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            Move {neural.moveIndex} / {neural.totalMoves}
            <span style={{
              marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 11,
              background: neural.inNeuralPhase ? 'var(--accent)' : 'var(--card-bg)',
              color: neural.inNeuralPhase ? '#fff' : 'var(--text-muted)',
              border: neural.inNeuralPhase ? 'none' : '1px solid var(--card-border)',
            }}>
              {neural.phaseLabel === 'thinking' ? '🧠 solving itself' : '⚙ computing'}
            </span>
          </span>
        )}

        {neural.status === 'done' && (
          <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--accent)' }}>
            Solved in {neural.totalMoves} moves
            {neural.solverPath && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                ({neural.solverPath === 'neural' ? 'pure neural net'
                  : neural.solverPath === 'neural_then_oracle' ? `neural ${neural.neuralLen}, then oracle`
                  : 'oracle'})
              </span>
            )}
          </span>
        )}

        {neural.status === 'already_solved' && (
          <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            Cube is already solved.
          </span>
        )}

        {neural.status === 'aborted' && (
          <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            Solve cancelled (cube changed).
          </span>
        )}

        {neural.status === 'error' && (
          <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--danger)' }}>
            {neural.error}
          </span>
        )}
      </div>
    </div>
  )
}