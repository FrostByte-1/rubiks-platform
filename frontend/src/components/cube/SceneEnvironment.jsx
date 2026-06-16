import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'

function readVars(names) {
  if (typeof window === 'undefined') return {}
  const style = getComputedStyle(document.documentElement)
  const out = {}
  for (const n of names) {
    const v = style.getPropertyValue(n).trim()
    out[n] = v || null
  }
  return out
}

function useThemeVars(names) {
  const [vars, setVars] = useState(() => readVars(names))
  useEffect(() => {
    const update = () => setVars(readVars(names))
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] })
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return vars
}

const VAR_NAMES = ['--scene-fog', '--scene-ambient', '--scene-key', '--scene-fill', '--scene-rim']

export default function SceneEnvironment() {
  const rim = useRef()
  const vars = useThemeVars(VAR_NAMES)

  const colors = useMemo(() => ({
    fog:     vars['--scene-fog']     || '#0a0816',
    ambient: vars['--scene-ambient'] || '#404060',
    key:     vars['--scene-key']     || '#ffffff',
    fill:    vars['--scene-fill']    || '#7080c0',
    rim:     vars['--scene-rim']     || '#22d3ee',
  }), [vars])

  useFrame(({ clock }) => {
    if (rim.current) {
      rim.current.position.x = Math.cos(clock.elapsedTime * 0.35) * 6
      rim.current.position.z = Math.sin(clock.elapsedTime * 0.35) * 6
    }
  })

  return (
    <>
      <color attach="background" args={[colors.fog]} />
      <fog attach="fog" args={[colors.fog, 9, 24]} />
      <ambientLight intensity={0.85} color={colors.ambient} />
      <directionalLight 
        position={[5, 8, 6]} 
        intensity={1.2} 
        color={colors.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      >
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.1, 50]} />
      </directionalLight>
      <directionalLight position={[-6, 3, -4]} intensity={0.6} color={colors.fill} />
      <pointLight ref={rim} position={[6, 2, 0]} intensity={1.0} color={colors.rim} distance={20} />
    </>
  )
}
