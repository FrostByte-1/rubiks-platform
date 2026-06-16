import { useEffect, useRef, useState } from 'react'

function format(ms) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
  return `${s}.${String(cs).padStart(2, '0')}`
}

export default function Timer({ running, startTime, onStop, currentTimeMs }) {
  const [, force] = useState(0)
  const intervalRef = useRef()

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => force((n) => n + 1), 30)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const ms = running ? Date.now() - startTime : currentTimeMs || 0

  return <div className="timer-display">{format(ms)}</div>
}

export { format as formatTime }