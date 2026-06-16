import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { formatTime } from './Timer.jsx'

const RANK_ICONS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ refreshKey, currentUser }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    api.leaderboard().then(setRows).catch((e) => setError(e.message))
  }, [refreshKey])

  if (error) return <p style={{ color: 'var(--danger)', fontSize: 13 }}>Error loading leaderboard: {error}</p>
  if (rows.length === 0) return (
    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
      <div>No times yet — be the first!</div>
    </div>
  )

  return (
    <div className="leaderboard">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Time</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isMe = currentUser && r.username === currentUser.username
            return (
              <tr key={r.id} className={isMe ? 'me' : ''}>
                <td>
                  {i < 3 ? RANK_ICONS[i] : <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>}
                </td>
                <td style={{ fontWeight: isMe ? 700 : 400 }}>
                  {r.username} {isMe ? '(you)' : ''}
                </td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatTime(r.seconds * 1000)}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}