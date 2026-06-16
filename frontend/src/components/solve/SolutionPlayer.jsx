import { invertMove } from '../cube/useCubeState.js'

export default function SolutionPlayer({ moves, cubeState, currentIndex, setCurrentIndex, onDone }) {
  const playing = cubeState.animating != null || cubeState.queueLength > 0

  const next = () => {
    if (currentIndex >= moves.length) return
    cubeState.queueMove(moves[currentIndex])
    setCurrentIndex(currentIndex + 1)
    if (currentIndex + 1 === moves.length && onDone) setTimeout(onDone, 500)
  }

  const prev = () => {
    if (currentIndex <= 0) return
    cubeState.queueMove(invertMove(moves[currentIndex - 1]))
    setCurrentIndex(currentIndex - 1)
  }

  const playAll = () => {
    const remaining = moves.slice(currentIndex)
    cubeState.queueMoves(remaining)
    setCurrentIndex(moves.length)
    if (onDone) setTimeout(onDone, remaining.length * 300)
  }

  const reset = () => {
    cubeState.clearQueue()
    for (let i = currentIndex - 1; i >= 0; i--) {
      cubeState.applyMoveInstant(invertMove(moves[i]))
    }
    setCurrentIndex(0)
  }

  return (
    <div>
      <div className="controls">
        <button onClick={prev} disabled={currentIndex === 0 || playing}>◀ Prev</button>
        <button onClick={next} disabled={currentIndex >= moves.length || playing}>Next ▶</button>
        <button onClick={playAll} disabled={currentIndex >= moves.length || playing}>▶▶ Play all</button>
        <button onClick={reset} disabled={currentIndex === 0 || playing}>Reset</button>
        <span style={{ alignSelf: 'center', marginLeft: 8 }}>
          {currentIndex} / {moves.length}
        </span>
      </div>
      <div className="move-list">
        {moves.map((m, i) => (
          <span key={i} className={i < currentIndex ? 'done' : i === currentIndex ? 'current' : ''}>
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}