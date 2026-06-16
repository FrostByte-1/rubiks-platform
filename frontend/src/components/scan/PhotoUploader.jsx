import { useState } from 'react'
import { api } from '../../api.js'
import { COLORS } from '../cube/useCubeState.js'

const FACES = ['U', 'R', 'F', 'D', 'L', 'B']
const FACE_LABEL = { U: 'Top', R: 'Right', F: 'Front', D: 'Bottom', L: 'Left', B: 'Back' }

export default function PhotoUploader({ onSubmit }) {
  const [faces, setFaces] = useState({})
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const upload = async (face, file) => {
    setBusy(face); setError(null)
    try {
      const { colors } = await api.detectFace(face, file)
      colors[4] = face
      setFaces((old) => ({ ...old, [face]: colors }))
    } catch (e) {
      setError(`${face}: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const ready = FACES.every((f) => faces[f])

  return (
    <div>
      <p>Take one clear, well-lit photo per face, holding the cube square to the camera.</p>
      {error && <p style={{ color: '#f88' }}>{error}</p>}
      <div className="face-grids">
        {FACES.map((f) => (
          <div key={f}>
            <div className="face-label">{FACE_LABEL[f]} ({f})</div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy === f}
              onChange={(e) => e.target.files[0] && upload(f, e.target.files[0])}
              style={{ width: 130 }}
            />
            {faces[f] && (
              <div className="color-grid" style={{ marginTop: 8 }}>
                {faces[f].map((c, i) => (
                  <div key={i} style={{ background: COLORS[c] || '#444' }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button style={{ marginTop: 16 }} disabled={!ready} onClick={() => onSubmit(faces)}>
        Solve this cube
      </button>
    </div>
  )
}