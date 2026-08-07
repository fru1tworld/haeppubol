import { useState } from 'react'
import { BallScene } from '../three/BallScene'
import { Controls } from '../components/Controls'
import { useSound } from '../audio/useSound'
import './SmashPage.css'

export const SmashPage = () => {
  const [ballSize, setBallSize] = useState(100)
  const { play, setVolume, volume } = useSound()

  return (
    <div className="smash-page">
      <div className="smash-scene">
        <BallScene
          ballSize={ballSize / 100}
          onChunk={() => play('pop')}
          onSmash={() => play('smash')}
        />
      </div>

      <Controls
        volume={volume}
        onVolumeChange={setVolume}
        ballSize={ballSize}
        onBallSizeChange={setBallSize}
        onReset={() => play('reset')}
      />
    </div>
  )
}
