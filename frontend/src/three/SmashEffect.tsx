import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { pastelColor } from './pastel'

const PARTICLE_COUNT = 25
const DURATION = 0.8
const GRAVITY = -9.8

interface SmashEffectProps {
  position: [number, number, number]
  active: boolean
  onComplete: () => void
}

export function SmashEffect({ position, active, onComplete }: SmashEffectProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const elapsedRef = useRef(0)
  const completedRef = useRef(false)

  useEffect(() => {
    if (active) {
      elapsedRef.current = 0
      completedRef.current = false
    }
  }, [active])

  const { velocities, initialPositions, colors } = useMemo(() => {
    const vel: THREE.Vector3[] = []
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const col = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ).normalize()
      const speed = 3 + Math.random() * 4
      vel.push(dir.multiplyScalar(speed))

      pos[i * 3] = 0
      pos[i * 3 + 1] = 0
      pos[i * 3 + 2] = 0

      const c = pastelColor()
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }

    return { velocities: vel, initialPositions: pos, colors: col }
  }, [])

  useFrame((_, delta) => {
    if (!active || !pointsRef.current) return

    elapsedRef.current += delta
    const t = elapsedRef.current

    if (t >= DURATION) {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
      return
    }

    const positions = pointsRef.current.geometry.attributes.position
    const damping = Math.max(0, 1 - t / DURATION)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const vel = velocities[i]
      ;(positions.array as Float32Array)[i * 3] = vel.x * t * damping
      ;(positions.array as Float32Array)[i * 3 + 1] = vel.y * t * damping + 0.5 * GRAVITY * t * t
      ;(positions.array as Float32Array)[i * 3 + 2] = vel.z * t * damping
    }
    positions.needsUpdate = true

    const mat = pointsRef.current.material as THREE.PointsMaterial
    mat.opacity = 1 - t / DURATION
  })

  if (!active) return null

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[initialPositions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={6}
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  )
}
