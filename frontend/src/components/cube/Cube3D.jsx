import { memo, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { MOVE_DEFS, isCubieInLayer } from './useCubeState.js'
import { useCubeSettings } from '../../theme/CubeSettingsProvider.jsx'
import SceneEnvironment from './SceneEnvironment.jsx'

const STICKER_SIZE = 0.85
const STICKER_OFFSET = 0.505

function useBodyMaterial(style) {
  return useMemo(() => {
    if (style === 'glass') {
      return { color: '#101015', metalness: 0.4, roughness: 0.15, transparent: true, opacity: 0.6 }
    }
    if (style === 'matte') {
      return { color: '#1a1a1f', metalness: 0.0, roughness: 0.9 }
    }
    if (style === 'classic') {
      return { color: '#121215', metalness: 0.0, roughness: 1.0 }
    }
    return { color: '#1a1a1f', metalness: 0.25, roughness: 0.55 }
  }, [style])
}

function useStickerFlags(style) {
  return useMemo(() => ({
    transparent: style === 'glass',
    opacity: style === 'glass' ? 0.92 : 1.0,
  }), [style])
}

function Sticker({ position, rotation, color, flags }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
      <meshStandardMaterial
        color={color}
        roughness={0.25}
        metalness={0.1}
        side={THREE.DoubleSide}
        transparent={flags.transparent}
        opacity={flags.opacity}
      />
    </mesh>
  )
}

function Cubie({ cubie, cubeState, faceColors, bodyMat, stickerFlags, bevel }) {
  const groupRef = useRef()
  const baseQuat = useMemo(() => cubie.quaternion.clone(), [cubie.quaternion])
  const basePos  = useMemo(() => cubie.position.clone(), [cubie.position])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const anim = cubeState.animating
    if (anim && isCubieInLayer(cubie, anim.face)) {
      const axis = MOVE_DEFS[anim.face].axis
      const t = anim.progress
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      const angle = anim.totalAngle * eased
      const layerQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle)
      g.position.copy(basePos).applyQuaternion(layerQuat)
      g.quaternion.copy(layerQuat).multiply(baseQuat)
    } else {
      g.position.copy(basePos)
      g.quaternion.copy(baseQuat)
    }
  })

  const size = 0.96
  const radius = Math.max(0.001, bevel)

  return (
    <group ref={groupRef}>
      <RoundedBox args={[size, size, size]} radius={radius} smoothness={4} creaseAngle={0.4} castShadow receiveShadow>
        <meshStandardMaterial {...bodyMat} />
      </RoundedBox>
      {cubie.stickers.px && (
        <Sticker position={[STICKER_OFFSET, 0, 0]} rotation={[0, Math.PI / 2, 0]}
          color={faceColors[cubie.colorFaces?.px || 'R']} flags={stickerFlags} />
      )}
      {cubie.stickers.nx && (
        <Sticker position={[-STICKER_OFFSET, 0, 0]} rotation={[0, -Math.PI / 2, 0]}
          color={faceColors[cubie.colorFaces?.nx || 'L']} flags={stickerFlags} />
      )}
      {cubie.stickers.py && (
        <Sticker position={[0, STICKER_OFFSET, 0]} rotation={[-Math.PI / 2, 0, 0]}
          color={faceColors[cubie.colorFaces?.py || 'U']} flags={stickerFlags} />
      )}
      {cubie.stickers.ny && (
        <Sticker position={[0, -STICKER_OFFSET, 0]} rotation={[Math.PI / 2, 0, 0]}
          color={faceColors[cubie.colorFaces?.ny || 'D']} flags={stickerFlags} />
      )}
      {cubie.stickers.pz && (
        <Sticker position={[0, 0, STICKER_OFFSET]} rotation={[0, 0, 0]}
          color={faceColors[cubie.colorFaces?.pz || 'F']} flags={stickerFlags} />
      )}
      {cubie.stickers.nz && (
        <Sticker position={[0, 0, -STICKER_OFFSET]} rotation={[0, Math.PI, 0]}
          color={faceColors[cubie.colorFaces?.nz || 'B']} flags={stickerFlags} />
      )}
    </group>
  )
}

function Scene({ cubeState }) {
  const { settings } = useCubeSettings()
  const bodyMat = useBodyMaterial(settings.cubeStyle)
  const stickerFlags = useStickerFlags(settings.cubeStyle)

  useFrame((_, dt) => { cubeState.advance(dt) })

  return (
    <>
      <SceneEnvironment />
      {cubeState.cubies.map((c) => (
        <Cubie
          key={c.id}
          cubie={c}
          cubeState={cubeState}
          faceColors={settings.faceColors}
          bodyMat={bodyMat}
          stickerFlags={stickerFlags}
          bevel={settings.bevelRadius}
        />
      ))}
    </>
  )
}

function Cube3D({ cubeState }) {
  const { settings } = useCubeSettings()
  return (
    <div className="cube-canvas">
      <Canvas
        key={settings.cubeStyle}
        shadows
        camera={{ position: [5, 4.5, 6], fov: 32 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.75]}
      >
        <Scene cubeState={cubeState} />
        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
        />
      </Canvas>
    </div>
  )
}

export default Cube3D