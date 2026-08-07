import { useState, useCallback } from 'react'
import type { DiningMode, SmashResult } from '../types'
import { DINING_MODE_LABEL, FOOD_CATEGORY_LABEL } from '../types'
import { api } from '../api/client'
import { SEONGSU_RESTAURANTS } from '../constants/restaurants'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { ModeSelector } from '../components/ModeSelector'
import { Controls } from '../components/Controls'
import { ResultCard } from '../components/ResultCard'
import { useSound } from '../audio/useSound'
import './MainPage.css'

export const MainPage = () => {
  const [mode, setMode] = useState<DiningMode>('dine-in')
  const [result, setResult] = useState<SmashResult | null>(null)
  const [ballSize, setBallSize] = useState(100)
  const [resetKey, setResetKey] = useState(0)
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

  const handleShare = useCallback(async () => {
    if (!result) return
    const r = result.restaurant
    await api.share.lunch({
      name: r.name,
      category: FOOD_CATEGORY_LABEL[r.category],
      mode: DINING_MODE_LABEL[result.mode],
      address: r.address,
      distanceFromStation: r.distanceFromStation,
      priceRange: r.priceRange,
      mapUrl: r.mapUrl,
    })
  }, [result])

  const handleModeChange = (m: DiningMode) => {
    setMode(m)
    play('toggle')
  }

  // 결과를 닫으면 새 왁뿌볼 — 부순 공으로는 다시 뽑을 수 없다
  const handleRetry = () => {
    setResult(null)
    setResetKey(k => k + 1)
    play('click')
  }

  const handleReset = () => {
    setResult(null)
    setResetKey(k => k + 1)
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
          resetKey={resetKey}
          smashAt={SMASH_REVEAL_AT}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={handleSmash}
        />
        <div className="result-anchor">
          <ResultCard result={result} onRetry={handleRetry} onShare={handleShare} />
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
