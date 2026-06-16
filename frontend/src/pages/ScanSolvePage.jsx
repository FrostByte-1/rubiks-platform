import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cube3D from '../components/cube/Cube3D.jsx'
import { useCubeState, invertMoves, normalizeMoves } from '../components/cube/useCubeState.js'
import SolutionPlayer from '../components/solve/SolutionPlayer.jsx'
import ManualColorGrid from '../components/scan/ManualColorGrid.jsx'
import PhotoUploader from '../components/scan/PhotoUploader.jsx'
import { api } from '../api.js'
import { takePendingScan } from '../pendingScan.js'



export default function ScanSolvePage() {
  const cube = useCubeState()
  const navigate = useNavigate()
  const [inputMode, setInputMode] = useState('manual')
  const [solution, setSolution] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    const pending = takePendingScan()
    if (pending) {
      cube.reset()
      handleSolveFromState(pending)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSolveFromState = async (state54) => {
    setError(null); setBusy(true); setSolution(null)
    try {
      const res = await api.solveFromState(state54)
      cube.reset()
      cube.applyMovesInstant(invertMoves(res.moves))
      setSolution(res.moves)
      setCurrentIndex(0)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleSolve = async (faces) => {
    setError(null); setBanner(null); setBusy(true); setSolution(null)
    try {
      const res = await api.solveFromFaces(faces)
      if (res.already_solved) {
        setBanner('That cube is already solved! Paint a scramble first.')
        return
      }
      cube.reset()
      cube.applyMovesInstant(invertMoves(res.moves))
      setSolution(res.moves)
      setCurrentIndex(0)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }



  return (
    <div>
      <h2>🔍 Scan &amp; Solve</h2>
      <div className="row">
        <div className="col">
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={() => setInputMode('manual')}
                disabled={inputMode === 'manual'}
                style={{ marginRight: 8 }}
              >
                ✏️ Enter colors manually
              </button>
              <button
                onClick={() => setInputMode('photo')}
                disabled={inputMode === 'photo'}
              >
                📷 Upload photos
              </button>
            </div>



            {inputMode === 'manual' ? (
              <ManualColorGrid onSubmit={handleSolve} />
            ) : (
              <PhotoUploader onSubmit={handleSolve} />
            )}

            {busy && (
              <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>⏳ Solving…</p>
            )}
            {banner && (
              <p style={{ color: 'var(--accent)', marginTop: 12, fontWeight: 600 }}>✅ {banner}</p>
            )}
            {error && (
              <p style={{ color: 'var(--danger)', marginTop: 12 }}>❌ {error}</p>
            )}
          </div>


        </div>

        <div className="col">
          <Cube3D cubeState={cube} />

          {solution && solution.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 8 }}>
                ⚡ Solution — {solution.length} moves
              </h3>
              <SolutionPlayer
                moves={solution}
                cubeState={cube}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
              />
            </div>
          )}


        </div>
      </div>
    </div>
  )
}