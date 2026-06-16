import { useMemo } from 'react'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import { useCubeSettings } from '../../theme/CubeSettingsProvider.jsx'
import SakuraPetals from './SakuraPetals.jsx'

function Particles({ count = 22 }) {
  const items = useMemo(() => (
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 18,
      duration: 16 + Math.random() * 18,
      size: 2 + Math.random() * 4,
    }))
  ), [count])
  return (
    <div className="bg-anim">
      {items.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function AnimatedBackground() {
  const { theme } = useTheme()
  const { settings } = useCubeSettings()
  if (!settings.showBackground) return null
  if (theme === 'sakura') return <SakuraPetals count={20} />
  if (theme === 'arctic') return <Particles count={18} />
  return <Particles count={22} />
}
