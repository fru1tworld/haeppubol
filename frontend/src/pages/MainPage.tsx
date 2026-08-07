import { useState, useCallback } from 'react'
import type { DiningMode, SmashResult } from '../types'
import { SEONGSU_RESTAURANTS } from '../constants/restaurants'
import { api } from '../api/client'
import { BallScene } from '../three/BallScene'
import { ModeSelector } from '../components/ModeSelector'
import { Controls } from '../components/Controls'
import { ResultCard } from '../components/ResultCard'
import { useSound } from '../audio/useSound'
import './MainPage.css'

export const MainPage = () => {
  const [mode, setMode] = useState<DiningMode>('dine-in')
  const [result, setResult] = useState<SmashResult | null>(null)
  const [ballSize, setBallSize] = useState(100)
  const { play, playCracks, setRubbing, setVolume, volume } = useSound()

  const handleSmash = useCallback(() => {
    play('smash')
    api.restaurants.random(mode).then(pick => {
      setResult({ restaurant: pick, mode, smashedAt: Date.now() })
      play('reveal')
    }).catch(() => {
      const candidates = SEONGSU_RESTAURANTS.filter(
        r => !r.closed && r.availableModes.includes(mode),
      )
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      setResult({ restaurant: pick, mode, smashedAt: Date.now() })
      play('reveal')
    })
  }, [mode, play])

  const handleModeChange = (m: DiningMode) => {
    setMode(m)
    play('toggle')
  }

  const handleRetry = () => {
    setResult(null)
    play('click')
  }

  const handleReset = () => {
    setResult(null)
    play('reset')
  }

  return (
    <div className="main-page">
      <header className="main-header">
        <ModeSelector mode={mode} onChange={handleModeChange} />
      </header>

      <div className="main-scene">
        <BallScene
          ballSize={ballSize / 100}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={handleSmash}
        />
        <div className="result-anchor">
          <ResultCard result={result} onRetry={handleRetry} />
        </div>
      </div>

      <Controls
        volume={volume}
        onVolumeChange={setVolume}
        ballSize={ballSize}
        onBallSizeChange={setBallSize}
        onReset={handleReset}
      />
    </div>
  )
}
