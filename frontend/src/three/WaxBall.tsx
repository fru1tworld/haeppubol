import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { buildShell } from './waxShell'
import {
  addDent,
  createDeformState,
  deformClay,
  deformSmooth,
  fieldOf,
  updateBulge,
} from './deformField'
import { createPhysicsState, freeze, stepPhysics } from './waxPhysics'
import { createWaxBuffers, updateSoftMesh, updateWax } from './waxGeometry'
import { DEFAULT_CORE_COLOR, DEFAULT_SHELL_COLOR, waxPalette } from './ballColors'
import type { CrackEvent, PhysicsSnapshot } from './waxTypes'

const HOLD_PRESS_MS = 190
const DRAG_START_PX = 9
const ROTATE_K = 0.0062
const SPIN_DAMP = 0.94
const AUTO_SPIN = 0.16
const CLAY_RADIUS = 0.94
const RUBBER_RADIUS = 1.03
const SQUEEZE_DEPTH = 0.17
const SQUASH_EPS = 0.0006
/** integrity < 0.06 = 완파. 기본값은 이 지점에서 onSmash */
const DEFAULT_SMASH_AT = 0.94

export interface CrackCondition {
  integrity: number
  temp: number
}

export interface ForceSample {
  force: number
  cracked: boolean
}

interface WaxBallProps {
  size?: number
  autoSpin?: boolean
  textureUrl?: string
  resetKey?: number
  freezeKey?: number
  /** 겉면(왁스) 색 */
  shellColor?: string
  /** 속(클레이) 색 */
  coreColor?: string
  /** onSmash가 터지는 파괴 진행도(0~1). 0.8이면 80% 부수면 발화 */
  smashAt?: number
  onCracks?: (events: CrackEvent[], cond: CrackCondition) => void
  onRubbing?: (force: number) => void
  /** 파괴 진행도가 smashAt에 도달하면 1회 */
  onSmash?: () => void
  onSnapshot?: (snap: PhysicsSnapshot, sample: ForceSample) => void
}

type Mode = 'idle' | 'undecided' | 'rotate' | 'press'

export function WaxBall({
  size = 1,
  autoSpin = true,
  textureUrl,
  resetKey = 0,
  freezeKey = 0,
  shellColor = DEFAULT_SHELL_COLOR,
  coreColor = DEFAULT_CORE_COLOR,
  smashAt = DEFAULT_SMASH_AT,
  onCracks,
  onRubbing,
  onSmash,
  onSnapshot,
}: WaxBallProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { gl, camera } = useThree()

  const shell = useMemo(() => buildShell(Math.random), [resetKey])
  const deform = useMemo(() => createDeformState(), [resetKey])
  const physics = useMemo(() => createPhysicsState(), [resetKey])
  const field = useMemo(() => fieldOf(deform), [deform])

  const waxBuffers = useMemo(() => createWaxBuffers(shell.triCount), [])
  useEffect(() => {
    waxBuffers.realloc(shell.triCount)
    dirtyRef.current = true
  }, [shell, waxBuffers])
  useEffect(() => () => waxBuffers.geometry.dispose(), [waxBuffers])

  const clayTexture = useMemo(() => {
    if (!textureUrl) return null
    const tex = new THREE.TextureLoader().load(textureUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [textureUrl])
  useEffect(() => () => { clayTexture?.dispose() }, [clayTexture])

  const clay = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 80, 54)
    if (!textureUrl) geo.deleteAttribute('uv')
    return { geo, base: (geo.attributes.position.array as Float32Array).slice() }
  }, [textureUrl])
  const rubber = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 52, 34)
    geo.deleteAttribute('uv')
    return { geo, base: (geo.attributes.position.array as Float32Array).slice() }
  }, [])
  useEffect(() => () => {
    clay.geo.dispose()
    rubber.geo.dispose()
  }, [clay, rubber])

  useEffect(() => {
    if (freezeKey > 0) freeze(physics)
  }, [freezeKey, physics])

  const dirtyRef = useRef(true)
  const smashedRef = useRef(false)
  useEffect(() => {
    smashedRef.current = false
  }, [resetKey])

  const palette = useMemo(() => waxPalette(shellColor), [shellColor])
  useEffect(() => {
    dirtyRef.current = true
  }, [palette])

  const modeRef = useRef<Mode>('idle')
  const downRef = useRef({ t: 0, x: 0, y: 0, lastX: 0, lastY: 0 })
  const spinRef = useRef({ x: 0, y: 0 })
  const pressDirRef = useRef(new THREE.Vector3(0, 0, 1))
  const prevSquashRef = useRef(0)

  // 드래그=회전 / 홀드=압착. 공 밖을 잡으면 회전만 (레퍼런스 645~708행)
  useEffect(() => {
    const canvas = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const hit = new THREE.Vector3()
    const closest = new THREE.Vector3()
    const pickSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), size)

    const pickDir = (cx: number, cy: number): { dir: THREE.Vector3; onBall: boolean } | null => {
      const group = groupRef.current
      if (!group) return null
      const r = canvas.getBoundingClientRect()
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      let onBall = true
      if (!ray.ray.intersectSphere(pickSphere, hit)) {
        onBall = false
        ray.ray.closestPointToPoint(pickSphere.center, closest)
        if (closest.lengthSq() < 1e-6) return null
        hit.copy(closest)
      }
      return { dir: group.worldToLocal(hit.clone()).normalize(), onBall }
    }

    const rotateBy = (dx: number, dy: number) => {
      const group = groupRef.current
      if (!group) return
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
      const q = new THREE.Quaternion().setFromAxisAngle(up, dx)
        .multiply(new THREE.Quaternion().setFromAxisAngle(right, dy))
      group.quaternion.premultiply(q)
    }

    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      const d = downRef.current
      d.t = performance.now()
      d.x = d.lastX = e.clientX
      d.y = d.lastY = e.clientY
      const picked = pickDir(e.clientX, e.clientY)
      if (picked) {
        pressDirRef.current.copy(picked.dir)
        deform.squeeze.dir.copy(picked.dir)
      }
      modeRef.current = picked?.onBall ? 'undecided' : 'rotate'
      spinRef.current.x = spinRef.current.y = 0
    }
    const move = (e: PointerEvent) => {
      const d = downRef.current
      const dx = e.clientX - d.lastX
      const dy = e.clientY - d.lastY
      if (
        modeRef.current === 'undecided' &&
        Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_START_PX
      ) {
        modeRef.current = 'rotate'
        physics.force = 0
      }
      if (modeRef.current === 'rotate') {
        rotateBy(dx * ROTATE_K, dy * ROTATE_K)
        spinRef.current.x = dx * ROTATE_K
        spinRef.current.y = dy * ROTATE_K
      } else if (modeRef.current === 'press') {
        const picked = pickDir(e.clientX, e.clientY)
        if (picked) {
          pressDirRef.current.copy(picked.dir)
          deform.squeeze.dir.copy(picked.dir)
        }
      }
      d.lastX = e.clientX
      d.lastY = e.clientY
    }
    const up = () => {
      modeRef.current = 'idle'
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [gl, camera, size, deform, physics])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    const dt = Math.min(0.1, delta)
    const nowMs = performance.now()

    if (modeRef.current === 'undecided' && nowMs - downRef.current.t > HOLD_PRESS_MS) {
      modeRef.current = 'press'
    }
    const pressing = modeRef.current === 'press' || modeRef.current === 'undecided'

    const events = stepPhysics(
      physics,
      { pressing, dt, nowMs, pressDir: pressDirRef.current },
      shell,
      Math.random,
      (dir, depth, radAng) => addDent(deform, dir, depth, radAng),
    )
    const cracked = events.length > 0
    if (cracked) onCracks?.(events, { integrity: physics.integrity, temp: physics.temp })

    // 탄성 압착 + 체적 보존 팽창
    deform.squeeze.depth = physics.squash * SQUEEZE_DEPTH
    updateBulge(deform)

    // 크랙 진행도 보간
    let anim = false
    for (const g of shell.groups) {
      if (Math.abs(g.c1t - g.c1) > 1e-4) {
        g.c1 += (g.c1t - g.c1) * Math.min(1, dt * 9)
        anim = true
      }
    }
    for (const c of shell.cells) {
      if (Math.abs(c.c2t - c.c2) > 1e-4) {
        c.c2 += (c.c2t - c.c2) * Math.min(1, dt * 7)
        anim = true
      }
    }

    const squashMoved = Math.abs(physics.squash - prevSquashRef.current) > SQUASH_EPS
    if (cracked || anim || squashMoved || dirtyRef.current) {
      prevSquashRef.current = physics.squash
      updateWax(shell, field, waxBuffers, palette)
      updateSoftMesh(clay.geo, clay.base, d => deformClay(deform, d), CLAY_RADIUS)
      updateSoftMesh(rubber.geo, rubber.base, d => deformSmooth(deform, d), RUBBER_RADIUS)
      dirtyRef.current = false
    }

    // 회전 관성 / 자동 회전
    if (modeRef.current !== 'rotate') {
      const s = spinRef.current
      if (Math.abs(s.x) > 1e-5 || Math.abs(s.y) > 1e-5) {
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
        const q = new THREE.Quaternion().setFromAxisAngle(up, s.x)
          .multiply(new THREE.Quaternion().setFromAxisAngle(right, s.y))
        group.quaternion.premultiply(q)
        s.x *= SPIN_DAMP
        s.y *= SPIN_DAMP
      } else if (autoSpin && modeRef.current === 'idle') {
        group.rotation.y += dt * AUTO_SPIN
      }
    }

    onRubbing?.(pressing ? physics.force : 0)

    if (!smashedRef.current && 1 - physics.integrity >= smashAt) {
      smashedRef.current = true
      onSmash?.()
    }

    onSnapshot?.(
      {
        integrity: physics.integrity,
        force: physics.force,
        threshold: physics.threshold,
        plasticTotal: deform.plasticTotal,
        temp: physics.temp,
        cracks: physics.cracks,
        shardsLeft: shell.cells.reduce((n, c) => n + (c.alive ? 1 : 0), 0),
      },
      { force: physics.force, cracked },
    )
  })

  return (
    <group ref={groupRef} scale={size}>
      <mesh geometry={clay.geo}>
        <meshPhysicalMaterial
          {...(clayTexture ? { map: clayTexture } : { color: coreColor })}
          roughness={0.66}
          clearcoat={0.3}
          clearcoatRoughness={0.6}
        />
      </mesh>
      <mesh geometry={waxBuffers.geometry}>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.42}
          clearcoat={0.55}
          clearcoatRoughness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rubber.geo}>
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.13}
          roughness={0.06}
          clearcoat={1}
          clearcoatRoughness={0.03}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
