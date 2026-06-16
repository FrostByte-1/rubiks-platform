import { useState } from 'react'
import { COLORS } from '../cube/useCubeState.js'

const FACES = ['U', 'R', 'F', 'D', 'L', 'B']
const FACE_LABEL = { U: 'Top', R: 'Right', F: 'Front', D: 'Bottom', L: 'Left', B: 'Back' }

// Each face starts solid with its own color.
function makeSolved() {
  const out = {}
  for (const f of FACES) out[f] = Array(9).fill(f)
  return out
}

export default function ManualColorGrid({ onSubmit }) {
  const [faces, setFaces] = useState(makeSolved)
  const [active, setActive] = useState('U')

  const setSticker = (face, idx) => {
    setFaces((old) => {
      const copy = { ...old, [face]: [...old[face]] }
      copy[face][idx] = active
      return copy
    })
  }

  return (
    <div>
      <p>Pick a color, then click stickers to paint. Centers are fixed.</p>
      <div className="color-picker">
        {FACES.map((f) => (
          <div
            key={f}
            className={f === active ? 'active' : ''}
            style={{ background: COLORS[f] }}
            onClick={() => setActive(f)}
            title={FACE_LABEL[f]}
          />
        ))}
      </div>
      <div className="face-grids">
        {FACES.map((f) => (
          <div key={f}>
            <div className="face-label">{FACE_LABEL[f]} ({f})</div>
            <div className="color-grid">
              {faces[f].map((c, i) => (
                <div
                  key={i}
                  style={{ background: COLORS[c], cursor: i === 4 ? 'not-allowed' : 'pointer' }}
                  onClick={() => i !== 4 && setSticker(f, i)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button style={{ marginTop: 16 }} onClick={() => onSubmit(faces)}>Solve this cube</button>
    </div>
  )
}