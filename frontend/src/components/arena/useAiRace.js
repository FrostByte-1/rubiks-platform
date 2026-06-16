import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'

const SOLVED_STR = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
const TICK_MS = 60
const MOVE_PAUSE_MS = 480   // post-move pause; ~11-13s total for a 20-move solve

function cubeAnimating(cube) {
  if (typeof cube.getAnim === 'function') return cube.getAnim() != null
  return !!cube.animating
}
function cubeQueueLen(cube) {
  if (typeof cube.getQueueLength === 'function') return cube.getQueueLength()
  return cube.queueLength || 0
}
function cubeStateStr(cube) {
  if (typeof cube.getState === 'function') return cube.getState()
  if (typeof cube.getCurrentState === 'function') return cube.getCurrentState()
  return null
}

export function useAiRace(cube) {
  const [status, setStatus] = useState('idle') // idle|fetching|racing|done|error
  const [moves, setMoves] = useState([])
  const [moveIndex, setMoveIndex] = useState(0)
  const [neuralLen, setNeuralLen] = useState(0)
  const [solverPath, setSolverPath] = useState(null)
  const [error, setError] = useState(null)
  const [finishMs, setFinishMs] = useState(null)

  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const indexRef = useRef(0)
  const movesRef = useRef([])
  const readyAtRef = useRef(0)

  const clearLoop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const reset = useCallback(() => {
    clearLoop()
    indexRef.current = 0
    movesRef.current = []
    startTimeRef.current = null
    readyAtRef.current = 0
    setMoves([]); setMoveIndex(0); setNeuralLen(0)
    setSolverPath(null); setError(null); setFinishMs(null)
    setStatus('idle')
  }, [clearLoop])

  const start = useCallback(async (state) => {
    reset()
    setStatus('fetching')
    let data
    try {
      data = await api.solveAiRace(state)
    } catch (e) {
      setError(e.message || 'machine solve failed'); setStatus('error'); return
    }

    const solution = data.moves || []
    movesRef.current = solution
    indexRef.current = 0
    setMoves(solution)
    setNeuralLen(data.neural_len ?? 0)
    setSolverPath(data.solver_path || null)

    if (solution.length === 0) { setStatus('done'); setFinishMs(0); return }

    setStatus('racing')
    startTimeRef.current = Date.now()

    timerRef.current = setInterval(() => {
      if (cubeAnimating(cube) || cubeQueueLen(cube) > 0) {
        readyAtRef.current = 0
        return
      }
      const now = Date.now()
      if (readyAtRef.current === 0) { readyAtRef.current = now + MOVE_PAUSE_MS; return }
      if (now < readyAtRef.current) return
      readyAtRef.current = 0

      const i = indexRef.current
      const list = movesRef.current
      if (i >= list.length) {
        clearLoop()
        setFinishMs(Date.now() - startTimeRef.current)
        setStatus('done')
        return
      }
      cube.queueMove(list[i])
      indexRef.current = i + 1
      setMoveIndex(i + 1)
    }, TICK_MS)
  }, [cube, reset, clearLoop])

  useEffect(() => () => clearLoop(), [clearLoop])

  // Derived: are we still in the neural phase of playback?
  const inNeuralPhase = moveIndex < neuralLen
  const phaseLabel =
    status !== 'racing' ? null
    : neuralLen === 0 ? 'computing'
    : inNeuralPhase ? 'thinking' : 'computing'

  return {
    status, moves, moveIndex, neuralLen,
    totalMoves: moves.length,
    solverPath, error, finishMs,
    phaseLabel, inNeuralPhase,
    start, reset,
  }
}
