import { useState, useCallback, useEffect } from 'react'
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

const CUSTOM_KEY = 'wakbbu-lunch-custom'

const loadCustomItems = (): string[] | null => {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const MainPage = () => {
  const [mode, setMode] = useState<DiningMode>('dine-in')
  const [result, setResult] = useState<SmashResult | null>(null)
  const [ballSize, setBallSize] = useState(100)
  const [resetKey, setResetKey] = useState(0)
  const [customizing, setCustomizing] = useState(false)
  const [customItems, setCustomItems] = useState<string[] | null>(loadCustomItems)
  const [inputValue, setInputValue] = useState('')
  const { play, playCracks, setRubbing, setVolume, volume } = useSound()

  useEffect(() => {
    if (customItems) {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customItems))
    } else {
      localStorage.removeItem(CUSTOM_KEY)
    }
  }, [customItems])

  const handleSmash = useCallback(() => {
    play('smash')

    if (customItems && customItems.length > 0) {
      const pick = customItems[Math.floor(Math.random() * customItems.length)]
      setResult({
        restaurant: { id: pick, name: pick, category: 'etc', description: '', address: '', distanceFromStation: '', priceRange: '', availableModes: ['dine-in', 'delivery'], tags: [] },
        mode,
        smashedAt: Date.now(),
      })
      play('reveal')
      return
    }

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
  }, [mode, play, customItems])

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

  const addItem = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (customItems?.includes(trimmed)) return
    setCustomItems(prev => [...(prev ?? []), trimmed])
    setInputValue('')
    play('pop')
  }

  const removeItem = (item: string) => {
    setCustomItems(prev => {
      const next = (prev ?? []).filter(i => i !== item)
      return next.length > 0 ? next : null
    })
  }

  const resetCustom = () => {
    setCustomItems(null)
    setCustomizing(false)
  }

  return (
    <div className="main-page">
      <header className="main-header">
        <ModeSelector mode={mode} onChange={handleModeChange} />
        <button
          className={`btn-customize${customizing ? ' active' : ''}`}
          onClick={() => setCustomizing(v => !v)}
        >
          {customizing ? '닫기' : '커스텀해보기'}
        </button>
      </header>

      {customizing && (
        <div className="customize-panel">
          <div className="customize-input-row">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addItem()}
              placeholder="메뉴/식당 이름 입력"
              className="customize-input"
            />
            <button className="btn-customize-add" onClick={addItem}>추가</button>
            {customItems && (
              <button className="btn-customize-reset" onClick={resetCustom}>초기화</button>
            )}
          </div>
          {customItems && customItems.length > 0 && (
            <div className="customize-chips">
              {customItems.map(item => (
                <span key={item} className="customize-chip">
                  {item}
                  <button onClick={() => removeItem(item)}>&times;</button>
                </span>
              ))}
            </div>
          )}
          {customItems && (
            <p className="customize-hint">커스텀 목록에서 랜덤 추첨됩니다</p>
          )}
        </div>
      )}

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
