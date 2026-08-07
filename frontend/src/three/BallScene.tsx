import { useState, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Background } from './Background'
import { Ball } from './Ball'
import { getBackgroundTheme } from './backgrounds'
import './BallScene.css'

interface BallSceneProps {
  ballSize?: number
  onChunk?: () => void
  onSmash?: () => void
  background?: string
}

function CameraZoom({ distance }: { distance: number }) {
  const camera = useThree(s => s.camera)
  useEffect(() => {
    camera.position.z = distance
    camera.updateProjectionMatrix()
  }, [camera, distance])
  return null
}

export function BallScene({ ballSize = 1.0, onChunk, onSmash, background }: BallSceneProps) {
  const [distance, setDistance] = useState(5)
  const theme = getBackgroundTheme(background)

  const handleWheel = (e: React.WheelEvent) => {
    setDistance(d => Math.min(9, Math.max(2.2, d + e.deltaY * 0.004)))
  }

  return (
    <div
      className={`ball-scene ${theme.light ? 'light' : 'dark'}`}
      style={{ background: theme.gradient }}
      onWheel={handleWheel}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <CameraZoom distance={distance} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Background theme={theme} />
        <Ball size={ballSize} onChunk={onChunk} onSmash={onSmash} />
      </Canvas>
    </div>
  )
}
