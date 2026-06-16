import { useCallback, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const PI2 = Math.PI / 2

export const COLORS = {
  U: '#ffffff', D: '#ffd500',
  F: '#009b48', B: '#0046ad',
  R: '#b71234', L: '#ff5800',
  inside: '#1a1a1a',
}

export const MOVE_DEFS = {
  U: { axis: new THREE.Vector3(0, 1, 0), layer: [1,  1] },
  D: { axis: new THREE.Vector3(0, 1, 0), layer: [1, -1] },
  R: { axis: new THREE.Vector3(1, 0, 0), layer: [0,  1] },
  L: { axis: new THREE.Vector3(1, 0, 0), layer: [0, -1] },
  F: { axis: new THREE.Vector3(0, 0, 1), layer: [2,  1] },
  B: { axis: new THREE.Vector3(0, 0, 1), layer: [2, -1] },
}

export const CW_ANGLE = {
  U: -PI2, D: PI2, R: -PI2, L: PI2, F: -PI2, B: PI2,
}

export function parseMove(move) {
  if (typeof move !== 'string' || move.length === 0)
    throw new Error('bad move: ' + JSON.stringify(move))
  const face = move[0]
  if (!MOVE_DEFS[face]) throw new Error('bad move: ' + JSON.stringify(move))
  const suf = move.slice(1)
  let qt = 1
  if (suf === "'") qt = -1
  else if (suf === '2') qt = 2
  else if (suf !== '') throw new Error('bad move: ' + JSON.stringify(move))
  return { face, quarterTurns: qt, totalAngle: CW_ANGLE[face] * qt }
}

export function invertMove(move) {
  const { face, quarterTurns } = parseMove(move)
  if (quarterTurns === 1) return face + "'"
  if (quarterTurns === -1) return face
  return face + '2'
}

export function invertMoves(moves) {
  return [...moves].reverse().map(invertMove)
}

export function normalizeMoves(input) {
  if (input == null) return []
  const arr = Array.isArray(input) ? input : String(input).split(/\s+/)
  const out = []
  for (const m of arr) {
    const trimmed = (m || '').trim()
    if (!trimmed) continue
    try { parseMove(trimmed); out.push(trimmed) }
    catch { console.warn('Skipping invalid move:', trimmed) }
  }
  return out
}

const SOLVED_STR = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

const MOVE_CYCLES_CW = {
  U: [[0,2,8,6],[1,5,7,3],[18,36,45,9],[19,37,46,10],[20,38,47,11]],
  R: [[9,11,17,15],[10,14,16,12],[20,2,51,29],[23,5,48,32],[26,8,45,35]],
  F: [[18,20,26,24],[19,23,25,21],[6,9,29,44],[7,12,28,41],[8,15,27,38]],
  D: [[27,29,35,33],[28,32,34,30],[24,15,51,42],[25,16,52,43],[26,17,53,44]],
  L: [[36,38,44,42],[37,41,43,39],[0,18,27,53],[3,21,30,50],[6,24,33,47]],
  B: [[45,47,53,51],[46,50,52,48],[0,42,35,11],[1,39,34,14],[2,36,33,17]],
}

function applyOneCycle(arr, cyc) {
  const last = arr[cyc[cyc.length - 1]]
  for (let i = cyc.length - 1; i > 0; i--) arr[cyc[i]] = arr[cyc[i - 1]]
  arr[cyc[0]] = last
}

function applyMoveToString(state, move) {
  const { face, quarterTurns } = parseMove(move)
  const cwTurns = ((quarterTurns % 4) + 4) % 4
  const arr = state.split('')
  for (let t = 0; t < cwTurns; t++)
    for (const cyc of MOVE_CYCLES_CW[face]) applyOneCycle(arr, cyc)
  return arr.join('')
}

function makeInitialCubies() {
  const cubies = []
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (x === 0 && y === 0 && z === 0) continue
    cubies.push({
      id: `${x}_${y}_${z}`,
      position: new THREE.Vector3(x, y, z),
      quaternion: new THREE.Quaternion(),
      stickers: {
        px: x === 1,
        nx: x === -1,
        py: y === 1,
        ny: y === -1,
        pz: z === 1,
        nz: z === -1,
      },
      colors: {
        px: x === 1  ? COLORS.R : COLORS.inside,
        nx: x === -1 ? COLORS.L : COLORS.inside,
        py: y === 1  ? COLORS.U : COLORS.inside,
        ny: y === -1 ? COLORS.D : COLORS.inside,
        pz: z === 1  ? COLORS.F : COLORS.inside,
        nz: z === -1 ? COLORS.B : COLORS.inside,
      },
    })
  }
  return cubies
}

export function isCubieInLayer(cubie, face) {
  const [axisIdx, value] = MOVE_DEFS[face].layer
  return Math.round(cubie.position.getComponent(axisIdx)) === value
}

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function useCubeState() {
  const [cubies, setCubies] = useState(makeInitialCubies)
  const [moveCount, setMoveCount] = useState(0)

  const animatingRef = useRef(null)
  const queueRef    = useRef([])
  const stateRef    = useRef(SOLVED_STR)

  const reset = useCallback(() => {
    setCubies(makeInitialCubies())
    queueRef.current = []
    animatingRef.current = null
    stateRef.current = SOLVED_STR
    setMoveCount(0)
  }, [])

  const _bake = useCallback((face, quarterTurns) => {
    const axis = MOVE_DEFS[face].axis
    const rot  = new THREE.Quaternion().setFromAxisAngle(axis, CW_ANGLE[face] * quarterTurns)
    setCubies(old => old.map(c => {
      if (!isCubieInLayer(c, face)) return c
      const newPos = c.position.clone().applyQuaternion(rot)
      newPos.set(Math.round(newPos.x), Math.round(newPos.y), Math.round(newPos.z))
      return { ...c, position: newPos, quaternion: rot.clone().multiply(c.quaternion) }
    }))
  }, [])

  const applyMoveInstant = useCallback(move => {
    try {
      const { face, quarterTurns } = parseMove(move)
      _bake(face, quarterTurns)
      stateRef.current = applyMoveToString(stateRef.current, move)
    } catch (e) { console.warn(e) }
  }, [_bake])

  const applyMovesInstant = useCallback(moves => {
    normalizeMoves(moves).forEach(applyMoveInstant)
  }, [applyMoveInstant])

  const queueMove  = useCallback(move  => { queueRef.current.push(...normalizeMoves([move])) }, [])
  const queueMoves = useCallback(moves => { queueRef.current.push(...normalizeMoves(moves))  }, [])
  const clearQueue = useCallback(() => { queueRef.current = [] }, [])

  const advance = useCallback((deltaSeconds, speed = 4.0) => {
    const a = animatingRef.current

    if (!a) {
      const next = queueRef.current.shift()
      if (!next) return null
      try {
        const parsed = parseMove(next)
        animatingRef.current = {
          face: parsed.face, quarterTurns: parsed.quarterTurns,
          totalAngle: parsed.totalAngle, progress: 0, move: next,
        }
        return animatingRef.current
      } catch (e) { console.warn(e); return null }
    }

    const newProgress = a.progress + deltaSeconds * speed
    if (newProgress >= 1) {
      _bake(a.face, a.quarterTurns)
      stateRef.current = applyMoveToString(stateRef.current, a.move)
      animatingRef.current = null
      setMoveCount(n => n + 1)
      return null
    }

    animatingRef.current = { ...a, progress: newProgress }
    return animatingRef.current
  }, [_bake])

  const getState  = useCallback(() => stateRef.current, [])
  const isSolved  = useCallback(() => stateRef.current === SOLVED_STR, [])

  return {
    cubies,
    moveCount,
    get animating()   { return animatingRef.current },
    get queueLength() { return queueRef.current.length },
    reset,
    applyMoveInstant,
    applyMovesInstant,
    queueMove,
    queueMoves,
    clearQueue,
    advance,
    getState,
    isSolved,
  }
}