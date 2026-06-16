import { useEffect, useState } from 'react'
import { auth } from '../../auth.js'

export default function UserBadge() {
  const [user, setUser] = useState(auth.getUser())
  useEffect(() => auth.onChange(() => setUser(auth.getUser())), [])
  if (!user) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
      <span style={{ fontSize: 14 }}>👤 {user.username}</span>
      <button onClick={() => auth.logout()} style={{ padding: '4px 10px', fontSize: 12 }}>
        Sign out
      </button>
    </div>
  )
}
