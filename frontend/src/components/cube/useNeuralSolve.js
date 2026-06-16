import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'

const SOLVED_STR = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
const TICK_MS = 60
const MOVE_PAUSE_MS = 220   // pause after each move finishes; tune for speed

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

export function useNeuralSolve(cube) {
  const [status, setStatus] = useState('idle') // idle|fetching|solving|done|error|already_solved|aborted
  const [moves, setMoves] = useState([])
  const [moveIndex, setMoveIndex] = useState(0)
  const [neuralLen, setNeuralLen] = useState(0)
  const [solverPath, setSolverPath] = useState(null)
  const [error, setError] = useState(null)

  const timerRef = useRef(null)
  const indexRef = useRef(0)
  const movesRef = useRef([])
  const readyAtRef = useRef(0)
  // The state we EXPECTED the cube to be in when we started animating.
  // If the cube ever diverges from this (user interacted), we abort.
  const expectedStateRef = useRef(null)
  const runIdRef = useRef(0)  // increments each solve; stale async returns are ignored

  const clearLoop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const abort = useCallback((reason = 'aborted') => {
    clearLoop()
    indexRef.current = 0
    movesRef.current = []
    readyAtRef.current = 0
    expectedStateRef.current = null
    setStatus(reason)
  }, [clearLoop])

  const reset = useCallback(() => {
    runIdRef.current += 1   // invalidate any in-flight fetch
    clearLoop()
    indexRef.current = 0
    movesRef.current = []
    readyAtRef.current = 0
    expectedStateRef.current = null
    setMoves([]); setMoveIndex(0); setNeuralLen(0)
    setSolverPath(null); setError(null)
    setStatus('idle')
  }, [clearLoop])

  const solve = useCallback(async () => {
    // EDGE CASE: a solve is already running -> ignore the click.
    if (status === 'fetching' || status === 'solving') return

    reset()
    const myRun = ++runIdRef.current

    const startState = cubeStateStr(cube)
    if (startState == null) {
      setError('cube state unavailable'); setStatus('error'); return
    }

    // EDGE CASE: already solved.
    if (startState === SOLVED_STR) {
      setStatus('already_solved'); return
    }

    setStatus('fetching')

    let data
    try {
      data = await api.solveAiRace(startState)
    } catch (e) {
      if (myRun !== runIdRef.current) return  // superseded
      setError(e?.message || 'solve request failed'); setStatus('error'); return
    }

    // EDGE CASE: a newer solve/reset happened while we were fetching.
    if (myRun !== runIdRef.current) return

    // EDGE CASE: user turned the cube during the fetch -> solution is stale.
    if (cubeStateStr(cube) !== startState) {
      setStatus('aborted'); return
    }

    const solution = data.moves || []
    movesRef.current = solution
    indexRef.current = 0
    expectedStateRef.current = startState
    setMoves(solution)
    setNeuralLen(data.neural_len ?? 0)
    setSolverPath(data.solver_path || null)

    // EDGE CASE: endpoint says no moves needed.
    if (solution.length === 0) {
      setStatus(data.solver_path === 'already_solved' ? 'already_solved' : 'done')
      return
    }

    setStatus('solving')

    timerRef.current = setInterval(() => {
      if (myRun !== runIdRef.current) { clearLoop(); return }

      // Wait for the current move to fully animate.
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
        setStatus(cubeStateStr(cube) === SOLVED_STR ? 'done' : 'done')
        return
      }

      cube.queueMove(list[i])
      indexRef.current = i + 1
      setMoveIndex(i + 1)
    }, TICK_MS)
  }, [cube, status, reset, clearLoop])

  // Clean up on unmount.
  useEffect(() => () => { runIdRef.current += 1; clearLoop() }, [clearLoop])

  const inNeuralPhase = moveIndex < neuralLen
  const phaseLabel =
    status !== 'solving' ? null
    : neuralLen === 0 ? 'computing'
    : inNeuralPhase ? 'thinking' : 'computing'

  return {
    status, moves, moveIndex, neuralLen,
    totalMoves: moves.length,
    solverPath, error, phaseLabel, inNeuralPhase,
    solve, reset, abort,
    isBusy: status === 'fetching' || status === 'solving',
  }
}
