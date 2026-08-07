import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { BackgroundTheme } from './backgrounds'

const GRID = 20
const DOT_SIZES = [2, 3, 4]

interface DotBucket {
  size: number
  positions: Float32Array
  baseColors: Float32Array
  colors: Float32Array
  phases: Float32Array
  speeds: Float32Array
}

function buildBuckets(theme: BackgroundTheme): DotBucket[] {
  const spacing = 1.2
  const palette = theme.dotColors.map(hex => new THREE.Color(hex))
  const dots = Array.from({ length: GRID * GRID }, (_, k) => {
    const i = Math.floor(k / GRID)
    const j = k % GRID
    return {
      x: (j - GRID / 2) * spacing,
      y: (i - GRID / 2) * spacing,
      size: DOT_SIZES[Math.floor(Math.random() * DOT_SIZES.length)],
    }
  })

  return DOT_SIZES.map(size => {
    const group = dots.filter(d => d.size === size)
    const positions = new Float32Array(group.length * 3)
    const baseColors = new Float32Array(group.length * 3)
    const phases = new Float32Array(group.length)
    const speeds = new Float32Array(group.length)

    group.forEach((d, i) => {
      positions[i * 3] = d.x
      positions[i * 3 + 1] = d.y
      positions[i * 3 + 2] = -8

      const c = palette[Math.floor(Math.random() * palette.length)]
      baseColors[i * 3] = c.r
      baseColors[i * 3 + 1] = c.g
      baseColors[i * 3 + 2] = c.b

      phases[i] = Math.random() * Math.PI * 2
      speeds[i] = 0.3 + Math.random() * 0.25
    })

    return { size, positions, baseColors, colors: baseColors.slice(), phases, speeds }
  })
}

export function Background({ theme }: { theme: BackgroundTheme }) {
  const groupRef = useRef<THREE.Group>(null)
  const colorAttrRefs = useRef<(THREE.BufferAttribute | null)[]>([])
  const { pointer } = useThree()

  const buckets = useMemo(() => buildBuckets(theme), [theme])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const targetRotX = pointer.y * 0.008
    const targetRotY = pointer.x * 0.008
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 2 * delta
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 2 * delta

    buckets.forEach((bucket, b) => {
      const attr = colorAttrRefs.current[b]
      if (!attr) return

      for (let i = 0; i < bucket.phases.length; i++) {
        bucket.phases[i] += delta * bucket.speeds[i]
        const twinkle = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(bucket.phases[i]))
        bucket.colors[i * 3] = bucket.baseColors[i * 3] * twinkle
        bucket.colors[i * 3 + 1] = bucket.baseColors[i * 3 + 1] * twinkle
        bucket.colors[i * 3 + 2] = bucket.baseColors[i * 3 + 2] * twinkle
      }
      attr.needsUpdate = true
    })
  })

  return (
    <group ref={groupRef}>
      {buckets.map((bucket, b) => (
        <points key={`${theme.id}-${bucket.size}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[bucket.positions, 3]}
            />
            <bufferAttribute
              ref={(el) => { colorAttrRefs.current[b] = el }}
              attach="attributes-color"
              args={[bucket.colors, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={bucket.size}
            vertexColors
            transparent
            opacity={bucket.size === 2 ? theme.dotOpacity * 0.7 : theme.dotOpacity}
            sizeAttenuation={false}
            depthWrite={false}
          />
        </points>
      ))}
    </group>
  )
}
