import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { useSound } from '../audio/useSound'
import { CREW_BALLS } from '../constants/crewBalls'
import { SOUND_SET_LIST } from '../audio/soundSets'
import type { SoundSetName } from '../audio/soundSets'
import './CustomPage.css'

interface SavedBall {
  id: string
  name: string
  items: string[]
  createdAt: string
  author?: string
  sound?: SoundSetName
}

const isSoundSetName = (v: string): v is SoundSetName =>
  SOUND_SET_LIST.some(s => s.name === v)

const STORAGE_KEY = 'wakbbuball-custom'

const loadSavedBalls = (): SavedBall[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export const CustomPage = () => {
  const [items, setItems] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [ballName, setBallName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [savedBalls, setSavedBalls] = useState<SavedBall[]>(loadSavedBalls)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const { play, soundSet, setSoundSet } = useSound()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBalls))
  }, [savedBalls])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('items')
    const name = params.get('name')
    const sound = params.get('sound')
    if (encoded) {
      setItems(encoded.split(',').map(decodeURIComponent))
      if (name) setBallName(name)
      if (sound && isSoundSetName(sound)) setSoundSet(sound)
      setIsCreating(true)
    }
  }, [setSoundSet])

  const addItem = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || items.includes(trimmed)) return
    setItems(prev => [...prev, trimmed])
    setInputValue('')
    play('pop')
  }

  const removeItem = (item: string) => {
    setItems(prev => prev.filter(i => i !== item))
  }

  const handleSmash = useCallback(() => {
    if (items.length === 0) return
    setResult(items[Math.floor(Math.random() * items.length)])
    play('reveal')
  }, [items, play])

  const saveBall = () => {
    const name = ballName.trim() || `왁뿌볼 #${savedBalls.length + 1}`
    const ball: SavedBall = {
      id: `ball-${Date.now()}`,
      name,
      items: [...items],
      createdAt: new Date().toISOString(),
      sound: soundSet,
    }
    setSavedBalls(prev => [ball, ...prev])
    setIsCreating(false)
    setItems([])
    setBallName('')
    setResult(null)
  }

  const loadBall = (ball: { name: string; items: readonly string[]; sound?: SoundSetName }) => {
    setItems([...ball.items])
    setBallName(ball.name)
    setSoundSet(ball.sound ?? 'classic')
    setIsCreating(true)
    setResult(null)
  }

  const deleteBall = (id: string) => {
    setSavedBalls(prev => prev.filter(b => b.id !== id))
  }

  const getShareUrl = () => {
    const base = window.location.origin + window.location.pathname
    const params = new URLSearchParams()
    params.set('items', items.map(encodeURIComponent).join(','))
    if (ballName.trim()) params.set('name', ballName.trim())
    if (soundSet !== 'classic') params.set('sound', soundSet)
    return `${base}?${params.toString()}#/custom`
  }

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(getShareUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isCreating) {
    return (
      <div className="custom-page">
        <div className="custom-header">
          <h1>왁뿌볼 게시판</h1>
          <button className="btn-new" onClick={() => setIsCreating(true)}>
            + 새 왁뿌볼 만들기
          </button>
        </div>

        <h2 className="board-section-title">내 왁뿌볼</h2>
        <div className="saved-grid">
          {savedBalls.length === 0 && (
            <p className="empty-text">저장된 왁뿌볼이 없습니다. 새로 만들어보세요!</p>
          )}
          {savedBalls.map(ball => (
            <div key={ball.id} className="saved-card" onClick={() => loadBall(ball)}>
              <div className="saved-card-header">
                <h3>
                  {ball.sound && ball.sound !== 'classic' && (
                    <span className="sound-badge">
                      {SOUND_SET_LIST.find(s => s.name === ball.sound)?.emoji}
                    </span>
                  )}
                  {ball.name}
                </h3>
                <button
                  className="btn-delete"
                  onClick={e => { e.stopPropagation(); deleteBall(ball.id) }}
                >
                  &times;
                </button>
              </div>
              <div className="saved-items">
                {ball.items.slice(0, 5).map(item => (
                  <span key={item} className="saved-item-chip">{item}</span>
                ))}
                {ball.items.length > 5 && (
                  <span className="saved-item-chip more">+{ball.items.length - 5}</span>
                )}
              </div>
              <p className="saved-date">{new Date(ball.createdAt).toLocaleDateString('ko-KR')}</p>
            </div>
          ))}
        </div>

        <h2 className="board-section-title">크루들의 왁뿌볼</h2>
        <div className="saved-grid">
          {CREW_BALLS.map(ball => (
            <div key={ball.id} className="saved-card" onClick={() => loadBall(ball)}>
              <div className="saved-card-header">
                <h3>{ball.name}</h3>
                <span className="author-badge">{ball.author}</span>
              </div>
              <div className="saved-items">
                {ball.items.slice(0, 5).map(item => (
                  <span key={item} className="saved-item-chip">{item}</span>
                ))}
                {ball.items.length > 5 && (
                  <span className="saved-item-chip more">+{ball.items.length - 5}</span>
                )}
              </div>
              <p className="saved-date">{new Date(ball.createdAt).toLocaleDateString('ko-KR')}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="custom-page dark">
      <div className="custom-create-header">
        <button className="btn-back" onClick={() => { setIsCreating(false); setItems([]); setBallName(''); setResult(null); setSoundSet('classic') }}>
          &larr; 목록
        </button>
        <input
          type="text"
          value={ballName}
          onChange={e => setBallName(e.target.value)}
          placeholder="왁뿌볼 이름"
          className="ball-name-input"
        />
        {items.length >= 2 && (
          <button className="btn-save" onClick={saveBall}>저장</button>
        )}
      </div>

      <div className="item-input-area">
        <div className="item-input-row">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addItem()}
            placeholder="아이템 입력"
            className="item-input"
          />
          <button className="btn-add" onClick={addItem}>추가</button>
        </div>
        <div className="item-chips">
          {items.map(item => (
            <span key={item} className="item-chip">
              {item}
              <button onClick={() => removeItem(item)}>&times;</button>
            </span>
          ))}
        </div>
        <div className="sound-set-row">
          <span className="sound-set-label">소리</span>
          {SOUND_SET_LIST.map(set => (
            <button
              key={set.name}
              className={`sound-set-chip${soundSet === set.name ? ' selected' : ''}`}
              onClick={() => { setSoundSet(set.name); play('smash') }}
            >
              {set.emoji} {set.label}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-scene">
        <BallScene onChunk={() => play('pop')} onSmash={() => { play('smash'); handleSmash() }} />
        {items.length < 2 && (
          <div className="scene-blocker">
            <p>아이템을 2개 이상 추가하세요</p>
          </div>
        )}
        {result && (
          <div className="result-anchor">
            <motion.div
              className="custom-result-card"
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <h2>{result}</h2>
              <p className="result-sub">왁뿌볼에서 뽑혔습니다!</p>
              <div className="result-actions">
                <button className="btn-retry" onClick={() => { setResult(null); play('click') }}>다시 뿌수기</button>
                <button className="btn-share" onClick={copyShareLink}>
                  {copied ? '복사됨!' : '공유 링크'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
