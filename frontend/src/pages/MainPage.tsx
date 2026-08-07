import { useState, useCallback, useEffect } from 'react'
import type { DiningMode, Restaurant, SmashResult } from '../types'
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

const localPick = (mode: DiningMode): Restaurant => {
  const candidates = SEONGSU_RESTAURANTS.filter(
    r => !r.closed && r.availableModes.includes(mode),
  )
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/** 커스텀 목록의 한 줄을 결과 카드가 아는 모양으로 감싼다 */
const customPick = (name: string): Restaurant => ({
  id: name,
  name,
  category: 'etc',
  description: '',
  address: '',
  distanceFromStation: '',
  priceRange: '',
  availableModes: ['dine-in', 'delivery'],
  tags: [],
})

export const MainPage = () => {
  const [mode, setMode] = useState<DiningMode>('dine-in')
  const [result, setResult] = useState<SmashResult | null>(null)
  const [ballSize, setBallSize] = useState(100)
  const [resetKey, setResetKey] = useState(0)
  const [customizing, setCustomizing] = useState(false)
  const [customItems, setCustomItems] = useState<string[] | null>(loadCustomItems)
  const [inputValue, setInputValue] = useState('')
  // 공 안에 미리 넣어두는 당첨 식당. 부술수록 이름이 비쳐 보인다
  const [sealed, setSealed] = useState<Restaurant | null>(null)
  const { play, playCracks, setRubbing, setVolume, volume } = useSound()

  useEffect(() => {
    if (customItems) {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customItems))
    } else {
      localStorage.removeItem(CUSTOM_KEY)
    }
  }, [customItems])

  // 커스텀 목록이 있으면 거기서, 없으면 서버(실패 시 로컬 후보)에서 미리 뽑는다
  useEffect(() => {
    let live = true
    setSealed(null)
    if (customItems && customItems.length > 0) {
      setSealed(customPick(customItems[Math.floor(Math.random() * customItems.length)]))
      return
    }
    api.restaurants.random(mode)
      .catch(() => localPick(mode))
      .then(pick => { if (live) setSealed(pick) })
    return () => { live = false }
  }, [mode, resetKey, customItems])

  const handleSmash = useCallback(() => {
    play('smash')
    const pick = sealed
      ?? (customItems && customItems.length > 0
        ? customPick(customItems[Math.floor(Math.random() * customItems.length)])
        : localPick(mode))
    setResult({ restaurant: pick, mode, smashedAt: Date.now() })
    play('reveal')
  }, [mode, play, sealed, customItems])

  const handleShare = useCallback(async () => {
    if (!result) return
    const r = result.restaurant
    const shortAddress = r.address.split(',')[0].trim()
    const searchQuery = `${shortAddress} ${r.name}`
    const mapUrl = r.mapUrl ?? `https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`
    const text = [
      `[점메추 왁뿌볼] ${r.name}`,
      `${FOOD_CATEGORY_LABEL[r.category]} · ${DINING_MODE_LABEL[result.mode]}`,
      r.address && `${r.address} · ${r.distanceFromStation}`,
      r.priceRange && `가격대: ${r.priceRange}`,
      mapUrl,
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    window.open('slack://open', '_blank')
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
          coreText={sealed?.name}
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
