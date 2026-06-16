const TECHNIQUES = [
  {
    name: 'Beginner / Layer-by-Layer',
    difficulty: 'Beginner',
    avgMoves: '~100 moves',
    summary: 'The classic method everyone starts with. Solves the cube one layer at a time using a handful of simple triggers. Takes most people about a week to memorise.',
    steps: [
      'White cross — get the four white edges aligned on top.',
      'White corners — fill in the four corners with the trigger R U R\' U\'.',
      'Middle-layer edges — insert the side edges with U R U\' R\' U\' F\' U F (or its mirror).',
      'Yellow cross — form a cross on the bottom face using F R U R\' U\' F\'.',
      'Yellow face — orient the last layer with the Sune algorithm R U R\' U R U2 R\'.',
      'Yellow corners and edges — cycle them into place with PLL algorithms.',
    ],
    youtube: 'https://www.youtube.com/results?search_query=how+to+solve+a+rubiks+cube+J+Perm',
    channel: 'J Perm — beginner method tutorial',
  },
  {
    name: 'CFOP / Fridrich',
    difficulty: 'Intermediate to Advanced',
    avgMoves: '~55 moves',
    summary: 'The most popular speedcubing method. Same cross-first idea as beginner, but solves the first two layers simultaneously (F2L) and learns full algorithm sets for the last layer (OLL and PLL).',
    steps: [
      'Cross on the bottom — usually solved in 6–8 moves with planning.',
      'F2L — insert corner-edge pairs into the bottom two layers simultaneously. 41 cases to learn but many are intuitive.',
      'OLL — Orient the Last Layer in one algorithm. 57 cases (or 10 for 2-look OLL).',
      'PLL — Permute the Last Layer in one algorithm. 21 cases (or 6 for 2-look PLL).',
    ],
    youtube: 'https://www.youtube.com/results?search_query=CFOP+tutorial+J+Perm',
    channel: 'J Perm — CFOP playlist',
  },
  {
    name: 'Roux',
    difficulty: 'Intermediate to Advanced',
    avgMoves: '~45 moves',
    summary: 'A block-building method popular among one-handed cubers. Fewer rotations and more turning efficiency than CFOP. Uses the M slice extensively.',
    steps: [
      'First block — solve a 1×2×3 block on the left side.',
      'Second block — solve a matching 1×2×3 on the right side.',
      'CMLL — orient and permute the four upper corners.',
      'L6E — solve the remaining six edges using only M and U turns.',
    ],
    youtube: 'https://www.youtube.com/results?search_query=Roux+method+tutorial',
    channel: 'Search for tutorials by Kian Mansour or Sean Patrick Villanueva',
  },
  {
    name: 'ZZ',
    difficulty: 'Advanced',
    avgMoves: '~50 moves',
    summary: 'Edge-orientation first. After the EOLine step, the rest of the cube can be solved without any F or B turns, making the rest very fast and rotation-free.',
    steps: [
      'EOLine — orient all 12 edges and place the DF and DB edges. Usually 6–7 moves.',
      'F2L — build the first two layers without F or B turns.',
      'LL — solve the last layer with OCLL + PLL, or full ZBLL for advanced cubers.',
    ],
    youtube: 'https://www.youtube.com/results?search_query=ZZ+method+tutorial',
    channel: 'Search for tutorials by Phil Yu or Antoine Cantin',
  },
  {
    name: 'Petrus',
    difficulty: 'Advanced',
    avgMoves: '~45 moves',
    summary: 'A block-building method designed to minimise total moves. Less algorithmic than CFOP, more intuitive — a favourite for fewest-moves competitions.',
    steps: [
      'Build a 2×2×2 block in any corner.',
      'Extend it to a 2×2×3 block.',
      'Orient the remaining edges.',
      'Finish the first two layers.',
      'Solve the last layer.',
    ],
    youtube: 'https://www.youtube.com/results?search_query=Petrus+method+rubiks+cube',
    channel: 'Search "Petrus method" tutorials',
  },
]

const NOTATION = [
  { sym: 'R, L, U, D, F, B', mean: 'Quarter-turn clockwise of the Right / Left / Up / Down / Front / Back face.' },
  { sym: "R', L', U', D', F', B'", mean: 'Counter-clockwise quarter-turn ("prime") of the same face.' },
  { sym: 'R2, L2, U2, D2, F2, B2', mean: 'Half-turn (180 degrees) of the face. Direction does not matter.' },
  { sym: 'x, y, z', mean: 'Whole-cube rotations around the R, U, F axes respectively.' },
  { sym: 'M, E, S', mean: 'Middle-slice turns (between R–L, U–D, F–B respectively).' },
]

export default function LearnPage() {
  return (
    <div>
      <h2>Learn</h2>
      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Notation cheat-sheet</h3>
        <p style={{ marginBottom: 10 }}>Every algorithm on the internet uses the same notation.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {NOTATION.map((n) => (
              <tr key={n.sym}>
                <td style={{
                  padding: '6px 14px 6px 0', fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600, color: 'var(--accent)', verticalAlign: 'top', width: 180,
                }}>{n.sym}</td>
                <td style={{ padding: '6px 0' }}>{n.mean}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: '24px 0 12px' }}>Solving methods</h3>
      <p style={{ marginBottom: 16 }}>
        There are dozens of ways to solve a Rubik's cube. Here are the five most-used. Pick one,
        watch the video, then try it on the Virtual Cube with the move list visible.
      </p>

      {TECHNIQUES.map((t) => (
        <div className="card" key={t.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>{t.name}</h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t.difficulty} · {t.avgMoves}
            </div>
          </div>
          <p style={{ marginTop: 10 }}>{t.summary}</p>
          <ol style={{ paddingLeft: 22, lineHeight: 1.7, margin: '8px 0' }}>
            {t.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <a
            href={t.youtube}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '6px 14px',
              background: 'var(--accent-grad)',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            ▶ Watch on YouTube · {t.channel}
          </a>
        </div>
      ))}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Want to go further?</h3>
        <p>
          The World Cube Association keeps official records and rules: see{' '}
          <a href="https://www.worldcubeassociation.org" target="_blank" rel="noopener noreferrer">
            worldcubeassociation.org
          </a>.
          Once you can solve the cube in under a minute, try the Speedcubing Arena to track your times.
        </p>
      </div>
    </div>
  )
}