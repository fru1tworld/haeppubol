import { useState, useCallback, useEffect } from 'react'
import type { DiningMode, Restaurant, SmashResult } from '../types'
import { FOOD_CATEGORY_LABEL } from '../types'
import { api } from '../api/client'
import { SEONGSU_RESTAURANTS } from '../constants/restaurants'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { Controls, MAX_BALL_SIZE } from '../components/Controls'
import { PlayButtons } from '../components/PlayButtons'
import { ResultCard } from '../components/ResultCard'
import { PageTabs } from '../components/PageTabs'
import { BallCustomizer, type BallCustomization } from '../components/BallCustomizer'
import { SOUND_SET_LIST } from '../audio/soundSets'
import { useSound } from '../audio/useSound'
import './MainPage.css'

type ActiveTab = 'list' | 'custom' | null

const DEFAULT_MODE: DiningMode = 'dine-in'

const localPick = (mode: DiningMode): Restaurant => {
  const candidates = SEONGSU_RESTAURANTS.filter(
    r => !r.closed && r.availableModes.includes(mode),
  )
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export const MainPage = () => {
  const [result, setResult] = useState<SmashResult | null>(null)
  const [ballSize, setBallSize] = useState(MAX_BALL_SIZE)
  const [resetKey, setResetKey] = useState(0)
  const [spinOn, setSpinOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const [sealed, setSealed] = useState<Restaurant | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>(null)
  const [editing, setEditing] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [newName, setNewName] = useState('')
  const [customization, setCustomization] = useState<BallCustomization>({
    shellColor: '#F5C6A0',
    coreColor: '#D97B5A',
    background: 'peach',
  })
  const { play, playCracks, setRubbing, setVolume, volume, muted, toggleMute, soundSet, setSoundSet } = useSound()

  useEffect(() => {
    api.restaurants.list()
      .then(setRestaurants)
      .catch(() => setRestaurants([...SEONGSU_RESTAURANTS]))
  }, [])

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

  const addRestaurant = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    try {
      const created = await api.restaurants.create({
        name: trimmed,
        category: 'etc',
        description: '',
        address: '',
        distanceFromStation: '',
        priceRange: '',
        availableModes: ['dine-in'],
        tags: [],
        password: 'fritz123',
      })
      setRestaurants(prev => [...prev, created])
      setNewName('')
    } catch {}
  }

  const removeRestaurant = async (r: Restaurant) => {
    const pw = prompt('어드민 비밀번호를 입력하세요')
    if (pw !== 'fritz123') {
      alert('비밀번호가 틀렸습니다')
      return
    }
    try {
      await api.restaurants.remove(r.id, pw)
      setRestaurants(prev => prev.filter(x => x.id !== r.id))
    } catch {}
  }

  return (
    <div className="main-page">
      <PageTabs tabs={[
        { label: '리스트', active: activeTab === 'list', onClick: () => { setActiveTab(v => v === 'list' ? null : 'list'); setEditing(false) } },
        { label: '왁뿌볼 커스텀하기', active: activeTab === 'custom', onClick: () => setActiveTab(v => v === 'custom' ? null : 'custom') },
      ]} />

      {activeTab === 'list' && (
        <div className="customize-panel">
          {editing && (
            <div className="customize-input-row">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addRestaurant()}
                placeholder="음식점 이름 입력"
                className="customize-input"
              />
              <button className="btn-customize-add" onClick={addRestaurant}>추가</button>
            </div>
          )}
          <div className="customize-chips">
            {restaurants.map(r => (
              <span key={r.id} className="customize-chip">
                {r.name}
                {editing && <button onClick={() => removeRestaurant(r)}>&times;</button>}
              </span>
            ))}
            {restaurants.length === 0 && (
              <span className="customize-hint">등록된 음식점이 없습니다</span>
            )}
          </div>
          <button className="btn-edit-toggle" onClick={() => setEditing(v => !v)}>
            {editing ? '완료' : '편집'}
          </button>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="customize-panel">
          <div className="customizer-section">
            <span className="customizer-label">사운드</span>
            <div className="customizer-options">
              {SOUND_SET_LIST.map(s => (
                <button
                  key={s.name}
                  className={`customizer-chip${soundSet === s.name ? ' selected' : ''}`}
                  onClick={() => { setSoundSet(s.name); play('pop') }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <BallCustomizer value={customization} onChange={setCustomization} />
        </div>
      )}

      <div className="main-scene">
        <BallScene
          ballSize={ballSize / 100}
          autoSpin={spinOn}
          freezeKey={freezeKey}
          resetKey={resetKey}
          smashAt={SMASH_REVEAL_AT}
          coreText={sealed?.name}
          shellColor={customization.shellColor}
          coreColor={customization.coreColor}
          background={customization.background}
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
          muted={muted}
          onToggleMute={toggleMute}
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
