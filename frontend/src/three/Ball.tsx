import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { SmashEffect } from './SmashEffect'
import { pastelColor } from './pastel'

const PRESS_RADIUS = 0.7
const PRESS_SPEED = 1.8
const RECOVER_SPEED = 2.5
const SINK_SCALE = 0.55
const CRUMPLE = 0.35
const FRAG_DURATION = 0.5

type BallState = 'alive' | 'respawning'

interface BallProps {
  size?: number
  onChunk?: () => void
  onSmash?: () => void
}

interface BallData {
  positions: Float32Array
  colors: Float32Array
  faceCount: number
  centroids: THREE.Vector3[]
  dirs: THREE.Vector3[]
}

function buildBallData(size: number): BallData {
  const geo = new THREE.IcosahedronGeometry(size, 2)
  const pos = geo.getAttribute('position')
  const positions = new Float32Array(pos.array)
  const faceCount = pos.count / 3
  const colors = new Float32Array(pos.count * 3)
  const centroids: THREE.Vector3[] = []
  const dirs: THREE.Vector3[] = []

  for (let f = 0; f < faceCount; f++) {
    const c = pastelColor()
    for (let j = 0; j < 3; j++) {
      colors[(f * 3 + j) * 3] = c.r
      colors[(f * 3 + j) * 3 + 1] = c.g
      colors[(f * 3 + j) * 3 + 2] = c.b
    }
    const centroid = new THREE.Vector3(
      (pos.getX(f * 3) + pos.getX(f * 3 + 1) + pos.getX(f * 3 + 2)) / 3,
      (pos.getY(f * 3) + pos.getY(f * 3 + 1) + pos.getY(f * 3 + 2)) / 3,
      (pos.getZ(f * 3) + pos.getZ(f * 3 + 1) + pos.getZ(f * 3 + 2)) / 3,
    )
    centroids.push(centroid)
    dirs.push(centroid.clone().normalize())
  }

  geo.dispose()
  return { positions, colors, faceCount, centroids, dirs }
}

function buildVisibleGeometry(data: BallData, mask: boolean[]): { geometry: THREE.BufferGeometry; faceMap: number[] } {
  const faceMap: number[] = []
  for (let f = 0; f < data.faceCount; f++) {
    if (mask[f]) faceMap.push(f)
  }

  const pos = new Float32Array(faceMap.length * 9)
  const col = new Float32Array(faceMap.length * 9)
  faceMap.forEach((f, w) => {
    pos.set(data.positions.subarray(f * 9, f * 9 + 9), w * 9)
    col.set(data.colors.subarray(f * 9, f * 9 + 9), w * 9)
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geometry.computeVertexNormals()
  return { geometry, faceMap }
}

interface Frag {
  verts: Float32Array
  color: THREE.Color
  p0: THREE.Vector3
  p1: THREE.Vector3
  p2: THREE.Vector3
  p3: THREE.Vector3
  rotation: THREE.Euler
  rotSpeed: THREE.Vector3
}

interface Chunk {
  id: number
  rotation: THREE.Euler
  posY: number
  frags: Frag[]
}

function makeFrag(data: BallData, f: number): Frag {
  const c = data.centroids[f]

  const verts = new Float32Array(9)
  for (let j = 0; j < 3; j++) {
    verts[j * 3] = data.positions[(f * 3 + j) * 3] - c.x
    verts[j * 3 + 1] = data.positions[(f * 3 + j) * 3 + 1] - c.y
    verts[j * 3 + 2] = data.positions[(f * 3 + j) * 3 + 2] - c.z
  }

  const color = new THREE.Color(
    data.colors[f * 9],
    data.colors[f * 9 + 1],
    data.colors[f * 9 + 2],
  )

  const lateral = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5,
  )

  const sunken = 1 - SINK_SCALE
  return {
    verts,
    color,
    p0: c.clone().multiplyScalar(sunken),
    p1: c.clone().multiplyScalar(sunken * 0.7).add(lateral.clone().multiplyScalar(0.08)),
    p2: c.clone().multiplyScalar(sunken * 0.35),
    p3: c.clone().multiplyScalar(0.02),
    rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
    rotSpeed: new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
    ),
  }
}

const cubicBezier = (
  p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3,
  t: number, out: THREE.Vector3,
): void => {
  const u = 1 - t
  out.set(0, 0, 0)
    .addScaledVector(p0, u * u * u)
    .addScaledVector(p1, 3 * u * u * t)
    .addScaledVector(p2, 3 * u * t * t)
    .addScaledVector(p3, t * t * t)
}

function ChunkFragments({ chunk, onComplete }: { chunk: Chunk; onComplete: (id: number) => void }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const elapsedRef = useRef(0)
  const doneRef = useRef(false)

  useFrame((_, delta) => {
    elapsedRef.current += delta
    const t = Math.min(elapsedRef.current / FRAG_DURATION, 1)
    const eased = t * t * (3 - 2 * t)

    chunk.frags.forEach((frag, i) => {
      const mesh = meshRefs.current[i]
      if (!mesh) return
      cubicBezier(frag.p0, frag.p1, frag.p2, frag.p3, eased, mesh.position)
      mesh.rotation.x = frag.rotation.x + frag.rotSpeed.x * elapsedRef.current
      mesh.rotation.y = frag.rotation.y + frag.rotSpeed.y * elapsedRef.current
      mesh.scale.setScalar(Math.max(1 - eased * 0.95, 0.001))

      const mat = matRefs.current[i]
      if (mat) mat.opacity = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5
    })

    if (t >= 1 && !doneRef.current) {
      doneRef.current = true
      onComplete(chunk.id)
    }
  })

  return (
    <group rotation={chunk.rotation} position={[0, chunk.posY, 0]}>
      {chunk.frags.map((frag, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el }}
          position={frag.p0}
          rotation={frag.rotation}
        >
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[frag.verts, 3]} />
          </bufferGeometry>
          <meshStandardMaterial
            ref={(el) => { matRefs.current[i] = el }}
            color={frag.color}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

export function Ball({ size = 1.0, onChunk, onSmash }: BallProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [state, setState] = useState<BallState>('alive')
  const [generation, setGeneration] = useState(0)
  const [version, setVersion] = useState(0)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [showEffect, setShowEffect] = useState(false)

  const holdingRef = useRef(false)
  const releaseAbsorbRef = useRef(false)
  const hitWorldRef = useRef(new THREE.Vector3())
  const wobbleRef = useRef({ t: 0, amp: 0 })
  const soundTimerRef = useRef(0)
  const respawnTimerRef = useRef(0)
  const chunkIdRef = useRef(0)
  const dragRef = useRef({ active: false, dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0 })

  const data = useMemo(() => buildBallData(size), [size, generation])
  const alive = useMemo(
    () => ({ mask: new Array<boolean>(data.faceCount).fill(true), left: data.faceCount }),
    [data],
  )
  const depthsRef = useRef(new Float32Array(0))
  const restsRef = useRef(new Float32Array(0))
  useMemo(() => {
    depthsRef.current = new Float32Array(data.faceCount)
    restsRef.current = new Float32Array(data.faceCount)
  }, [data])

  const geomInfo = useMemo(
    () => buildVisibleGeometry(data, alive.mask),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, alive, version],
  )
  useEffect(() => () => geomInfo.geometry.dispose(), [geomInfo])

  const bumps = useMemo(() => {
    const count = geomInfo.faceMap.length
    const inst = new THREE.InstancedMesh(
      new THREE.SphereGeometry(size * 0.14, 10, 10),
      new THREE.MeshStandardMaterial(),
      Math.max(count, 1),
    )
    inst.count = count
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    geomInfo.faceMap.forEach((f, w) => {
      dummy.position.copy(data.centroids[f])
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      inst.setMatrixAt(w, dummy.matrix)
      color.setRGB(data.colors[f * 9], data.colors[f * 9 + 1], data.colors[f * 9 + 2])
      inst.setColorAt(w, color)
    })
    inst.instanceMatrix.needsUpdate = true
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true
    return inst
  }, [geomInfo, data, size])

  useEffect(() => () => {
    bumps.geometry.dispose()
    ;(bumps.material as THREE.Material).dispose()
    bumps.dispose()
  }, [bumps])

  useEffect(() => {
    const release = () => {
      if (holdingRef.current) releaseAbsorbRef.current = true
      holdingRef.current = false
      dragRef.current.active = false
      dragRef.current.dragging = false
    }
    const down = (ev: PointerEvent) => {
      if (!(ev.target instanceof HTMLCanvasElement)) return
      if (holdingRef.current) return
      const d = dragRef.current
      d.active = true
      d.dragging = false
      d.startX = d.lastX = ev.clientX
      d.startY = d.lastY = ev.clientY
    }
    const move = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d.active) return
      const dx = ev.clientX - d.lastX
      const dy = ev.clientY - d.lastY
      d.lastX = ev.clientX
      d.lastY = ev.clientY
      if (!d.dragging && Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) > 3) {
        d.dragging = true
      }
      if (d.dragging && meshRef.current) {
        meshRef.current.rotation.y += dx * 0.008
        meshRef.current.rotation.x += dy * 0.008
      }
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointermove', move)
    }
  }, [])

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (state !== 'alive') return
    e.stopPropagation()
    holdingRef.current = true
    hitWorldRef.current.copy(e.point)
  }, [state])

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (holdingRef.current) hitWorldRef.current.copy(e.point)
  }, [])

  const removeChunk = useCallback((id: number) => {
    setChunks(prev => prev.filter(c => c.id !== id))
  }, [])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const w = wobbleRef.current
    w.t += delta
    w.amp *= Math.exp(-3 * delta)
    const jiggle = Math.sin(w.t * 18) * w.amp
    const breath = Math.sin(Date.now() * 0.0022) * 0.025

    if (state === 'respawning') {
      respawnTimerRef.current += delta
      const progress = Math.min(respawnTimerRef.current / 0.45, 1)
      const c1 = 1.70158
      const c3 = c1 + 1
      const eased = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2)
      mesh.scale.setScalar(Math.max(eased, 0.001))
      mesh.position.y = 0

      if (progress >= 1) {
        mesh.scale.setScalar(1)
        w.amp = 0.25
        w.t = 0
        setState('alive')
      }
      return
    }

    if (!holdingRef.current && !dragRef.current.dragging) {
      mesh.rotation.y += 0.3 * delta
    }
    mesh.position.y = Math.sin(Date.now() * 0.001) * 0.1
    mesh.scale.set(
      1 + 0.6 * jiggle - breath * 0.8,
      1 - jiggle + breath,
      1 + 0.6 * jiggle - breath * 0.8,
    )

    const depths = depthsRef.current
    soundTimerRef.current += delta

    if (holdingRef.current) {
      const local = mesh.worldToLocal(hitWorldRef.current.clone()).normalize()

      let pressedAny = false
      for (const f of geomInfo.faceMap) {
        const dot = THREE.MathUtils.clamp(data.dirs[f].dot(local), -1, 1)
        const ang = Math.acos(dot)
        if (ang < PRESS_RADIUS) {
          depths[f] = Math.min(1, depths[f] + delta * PRESS_SPEED * (1 - ang / PRESS_RADIUS))
          pressedAny = true
        }
      }

      if (!pressedAny && geomInfo.faceMap.length > 0) {
        let best = geomInfo.faceMap[0]
        let bestDot = -2
        for (const f of geomInfo.faceMap) {
          const d = data.dirs[f].dot(local)
          if (d > bestDot) { bestDot = d; best = f }
        }
        const seed = data.dirs[best]
        for (const f of geomInfo.faceMap) {
          const dot = THREE.MathUtils.clamp(data.dirs[f].dot(seed), -1, 1)
          const ang = Math.acos(dot)
          if (ang < PRESS_RADIUS) {
            depths[f] = Math.min(1, depths[f] + delta * PRESS_SPEED * (1 - ang / PRESS_RADIUS))
          }
        }
      }
    } else {
      const rests = restsRef.current
      for (const f of geomInfo.faceMap) {
        if (depths[f] > rests[f]) {
          depths[f] = Math.max(rests[f], depths[f] - delta * RECOVER_SPEED)
        }
      }
    }

    let absorbed: number[] = []
    if (releaseAbsorbRef.current) {
      releaseAbsorbRef.current = false
      const rests = restsRef.current
      absorbed = geomInfo.faceMap.filter(f => depths[f] >= 0.95)
      for (const f of geomInfo.faceMap) {
        if (depths[f] < 0.95 && depths[f] > rests[f]) {
          rests[f] = depths[f] * 0.7
        }
      }
      const remaining = geomInfo.faceMap.length - absorbed.length
      if (absorbed.length > 0 && remaining > 0 && remaining <= data.faceCount * 0.08) {
        absorbed = [...geomInfo.faceMap]
      }
    }
    if (absorbed.length > 0) {
      const frags = absorbed.map(f => makeFrag(data, f))
      absorbed.forEach(f => { alive.mask[f] = false })
      alive.left -= absorbed.length

      setChunks(prev => [
        ...prev,
        {
          id: chunkIdRef.current++,
          rotation: mesh.rotation.clone(),
          posY: mesh.position.y,
          frags,
        },
      ])
      setVersion(v => v + 1)
      w.amp = Math.min(w.amp + 0.18, 0.35)
      w.t = 0

      if (soundTimerRef.current >= 0.12) {
        soundTimerRef.current = 0
        onChunk?.()
      }

      if (alive.left === 0) {
        holdingRef.current = false
        setShowEffect(true)
        onSmash?.()
        respawnTimerRef.current = 0
        setState('respawning')
        setGeneration(g => g + 1)
        return
      }
    }

    const posAttr = geomInfo.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    const dummy = new THREE.Object3D()
    let bumpsDirty = false

    geomInfo.faceMap.forEach((f, wi) => {
      const depth = depths[f]
      const s = 1 - depth * SINK_SCALE
      const crumple = depth * CRUMPLE
      const c = data.centroids[f]

      for (let j = 0; j < 3; j++) {
        const bx = data.positions[f * 9 + j * 3]
        const by = data.positions[f * 9 + j * 3 + 1]
        const bz = data.positions[f * 9 + j * 3 + 2]
        arr[wi * 9 + j * 3] = (bx + (c.x - bx) * crumple) * s
        arr[wi * 9 + j * 3 + 1] = (by + (c.y - by) * crumple) * s
        arr[wi * 9 + j * 3 + 2] = (bz + (c.z - bz) * crumple) * s
      }

      dummy.position.copy(c).multiplyScalar(s)
      dummy.scale.setScalar(Math.max(1 - depth * 0.8, 0.05))
      dummy.updateMatrix()
      bumps.setMatrixAt(wi, dummy.matrix)
      bumpsDirty = true
    })

    posAttr.needsUpdate = true
    if (bumpsDirty) bumps.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geomInfo.geometry}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
        <primitive object={bumps} />
        <mesh>
          <icosahedronGeometry args={[size * 0.8, 1]} />
          <meshStandardMaterial
            color="#3a3a5e"
            emissive="#F5C6A0"
            emissiveIntensity={0.15}
            flatShading
          />
        </mesh>
      </mesh>

      {chunks.map(chunk => (
        <ChunkFragments key={chunk.id} chunk={chunk} onComplete={removeChunk} />
      ))}

      <SmashEffect
        position={[0, 0, 0]}
        active={showEffect}
        onComplete={() => setShowEffect(false)}
      />
    </group>
  )
}
