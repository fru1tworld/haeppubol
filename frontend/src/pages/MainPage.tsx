import { useState, useCallback, useEffect } from 'react'
import type { DiningMode, Restaurant, SmashResult } from '../types'
import { FOOD_CATEGORY_LABEL } from '../types'
import { api } from '../api/client'
import { SEONGSU_RESTAURANTS } from '../constants/restaurants'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { Controls } from '../components/Controls'
import { PlayButtons } from '../components/PlayButtons'
import { ResultCard } from '../components/ResultCard'
import { useSound } from '../audio/useSound'
import './MainPage.css'

const DEFAULT_MODE: DiningMode = 'dine-in'

const localPick = (mode: DiningMode): Restaurant => {
  const candidates = SEONGSU_RESTAURANTS.filter(
    r => !r.closed && r.availableModes.includes(mode),
  )
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export const MainPage = () => {
  const [result, setResult] = useState<SmashResult | null>(null)
  const [ballSize, setBallSize] = useState(100)
  const [resetKey, setResetKey] = useState(0)
  const [spinOn, setSpinOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const [sealed, setSealed] = useState<Restaurant | null>(null)
  const { play, playCracks, setRubbing, setVolume, volume } = useSound()

  useEffect(() => {
    let live = true
    setSealed(null)
    api.restaurants.random(DEFAULT_MODE)
      .catch(() => localPick(DEFAULT_MODE))
      .then(pick => { if (live) setSealed(pick) })
    return () => { live = false }
  }, [resetKey])

  const handleSmash = useCallback(() => {
    play('smash')
    const pick = sealed ?? localPick(DEFAULT_MODE)
    setResult({ restaurant: pick, mode: DEFAULT_MODE, smashedAt: Date.now() })
    play('reveal')
  }, [play, sealed])

  const handleShare = useCallback(async () => {
    if (!result) return
    const r = result.restaurant
    const shortAddress = r.address.split(',')[0].trim()
    const searchQuery = `${shortAddress} ${r.name}`
    const mapUrl = r.mapUrl ?? `https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`
    try {
      await api.share.lunch({
        name: r.name,
        category: r.category,
        mode: result.mode,
        address: r.address,
        distanceFromStation: r.distanceFromStation,
        priceRange: r.priceRange,
        mapUrl,
      })
    } catch {
      const text = [
        `[점메추 왁뿌볼] ${r.name}`,
        FOOD_CATEGORY_LABEL[r.category],
        r.address && `${r.address} · ${r.distanceFromStation}`,
        r.priceRange && `가격대: ${r.priceRange}`,
        mapUrl,
      ].filter(Boolean).join('\n')
      await navigator.clipboard.writeText(text)
    }
  }, [result])

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
        <button
          className="btn-customize"
          onClick={() => { window.location.hash = '/wakbbu' }}
        >
          커스텀 해보기
        </button>
      </header>

      <div className="main-scene">
        <BallScene
          ballSize={ballSize / 100}
          autoSpin={spinOn}
          freezeKey={freezeKey}
          resetKey={resetKey}
          smashAt={SMASH_REVEAL_AT}
          coreText={sealed?.name}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={handleSmash}
        />
        <div className="result-anchor">
          <ResultCard result={result} onRetry={handleRetry} onShare={handleShare} />
        </div>
        <Controls
          volume={volume}
          onVolumeChange={setVolume}
          ballSize={ballSize}
          onBallSizeChange={setBallSize}
          onReset={handleReset}
        />
        <PlayButtons
          frozen={frozen}
          spinOn={spinOn}
          onFreeze={() => { setFreezeKey(k => k + 1); setFrozen(true); setTimeout(() => setFrozen(false), 90_000) }}
          onToggleSpin={() => setSpinOn(v => !v)}
          onNewBall={handleReset}
        />
      </div>
    </div>
  )
}
