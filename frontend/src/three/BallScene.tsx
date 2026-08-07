import { useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WaxBall } from './WaxBall'
import type { CrackCondition, ForceSample } from './WaxBall'
import { getBackgroundTheme } from './backgrounds'
import type { CrackEvent, PhysicsSnapshot } from './waxTypes'
import './BallScene.css'

interface BallSceneProps {
  ballSize?: number
  background?: string
  textureUrl?: string
  autoSpin?: boolean
  resetKey?: number
  freezeKey?: number
  shellColor?: string
  coreColor?: string
  coreText?: string
  faceUrl?: string
  smashAt?: number
  onCracks?: (events: CrackEvent[], cond: CrackCondition) => void
  onRubbing?: (force: number) => void
  onSmash?: () => void
  onSnapshot?: (snap: PhysicsSnapshot, sample: ForceSample) => void
}

function CameraZoom({ distance }: { distance: number }) {
  const camera = useThree(s => s.camera)
  useEffect(() => {
    camera.position.z = distance
    camera.updateProjectionMatrix()
  }, [camera, distance])
  return null
}

// 그라디언트 + 소프트박스 2개를 환경맵으로 (레퍼런스 348~365행)
function envTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')!
  const gr = g.createLinearGradient(0, 0, 0, 256)
  gr.addColorStop(0, '#ffffff')
  gr.addColorStop(0.35, '#c9d6ea')
  gr.addColorStop(0.55, '#6b6480')
  gr.addColorStop(1, '#141018')
  g.fillStyle = gr
  g.fillRect(0, 0, 512, 256)
  g.globalCompositeOperation = 'lighter'
  const boxes: Array<[number, number, number]> = [[120, 60, 90], [380, 95, 60]]
  boxes.forEach(([x, y, r]) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, 'rgba(255,255,255,0.95)')
    rg.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = rg
    g.fillRect(0, 0, 512, 256)
  })
  const tex = new THREE.CanvasTexture(c)
  tex.mapping = THREE.EquirectangularReflectionMapping
  return tex
}

function EnvMap() {
  const gl = useThree(s => s.gl)
  const scene = useThree(s => s.scene)
  useEffect(() => {
    const tex = envTexture()
    const pmrem = new THREE.PMREMGenerator(gl)
    const rt = pmrem.fromEquirectangular(tex)
    scene.environment = rt.texture
    tex.dispose()
    pmrem.dispose()
    return () => {
      scene.environment = null
      rt.texture.dispose()
    }
  }, [gl, scene])
  return null
}

export function BallScene({
  ballSize = 1.0,
  background,
  textureUrl,
  autoSpin = true,
  resetKey,
  freezeKey,
  shellColor,
  coreColor,
  coreText,
  faceUrl,
  smashAt,
  onCracks,
  onRubbing,
  onSmash,
  onSnapshot,
}: BallSceneProps) {
  const [distance, setDistance] = useState(4.55)
  const theme = getBackgroundTheme(background)

  const handleWheel = (e: React.WheelEvent) => {
    setDistance(d => Math.min(9, Math.max(2.6, d + e.deltaY * 0.004)))
  }

  return (
    <div
      className={`ball-scene ${theme.light ? 'light' : 'dark'}`}
      style={{ background: theme.gradient }}
      onWheel={handleWheel}
    >
      <Canvas
        camera={{ position: [0, 0, 4.55], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
        }}
      >
        <CameraZoom distance={distance} />
        <EnvMap />
        <hemisphereLight args={['#dfe8ff', '#2a1620', 0.55]} />
        <directionalLight position={[-2.2, 2.6, 2.4]} intensity={2.0} color="#fff4e2" />
        <directionalLight position={[2.6, -1.0, 1.6]} intensity={0.55} color="#9fb6ff" />
        <directionalLight position={[0.6, 0.4, -3.0]} intensity={1.1} color="#ffd9c0" />
        <WaxBall
          size={ballSize}
          autoSpin={autoSpin}
          textureUrl={textureUrl}
          resetKey={resetKey}
          freezeKey={freezeKey}
          shellColor={shellColor}
          coreColor={coreColor}
          coreText={coreText}
          faceUrl={faceUrl}
          smashAt={smashAt}
          onCracks={onCracks}
          onRubbing={onRubbing}
          onSmash={onSmash}
          onSnapshot={onSnapshot}
        />
      </Canvas>
    </div>
  )
}
