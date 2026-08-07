import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { useSound } from '../audio/useSound'
import { CREW_BALLS } from '../constants/crewBalls'
import { SOUND_SET_LIST } from '../audio/soundSets'
import type { SoundSetName } from '../audio/soundSets'
import { BACKGROUND_THEMES, DEFAULT_BACKGROUND, isBackgroundId } from '../three/backgrounds'
import { BallColorPicker } from '../components/BallColorPicker'
import { Controls } from '../components/Controls'
import { DEFAULT_CORE_COLOR, DEFAULT_SHELL_COLOR, isHexColor } from '../three/ballColors'
import './CustomPage.css'

interface SavedBall {
  id: string
  name: string
  items: string[]
  createdAt: string
  author?: string
  sound?: SoundSetName
  background?: string
  imageUrl?: string
  shellColor?: string
  coreColor?: string
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

type BoardTab = 'all' | 'mine' | 'crew'

const BOARD_TABS: readonly { key: BoardTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'mine', label: '내 왁뿌볼' },
  { key: 'crew', label: '크루' },
]

export const CustomPage = ({ initialMode = 'create' }: { initialMode?: 'board' | 'create' }) => {
  const [items, setItems] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [ballName, setBallName] = useState('')
  const [boardTab, setBoardTab] = useState<BoardTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [savedBalls, setSavedBalls] = useState<SavedBall[]>(loadSavedBalls)
  const [background, setBackground] = useState(DEFAULT_BACKGROUND)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [shellColor, setShellColor] = useState(DEFAULT_SHELL_COLOR)
  const [coreColor, setCoreColor] = useState(DEFAULT_CORE_COLOR)
  const [mode, setMode] = useState<'board' | 'create' | 'play'>(initialMode)
  const [playMode, setPlayMode] = useState<'lottery' | 'smash'>('lottery')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [ballSize, setBallSize] = useState(100)
  const { play, playCracks, setRubbing, soundSet, setSoundSet, volume, setVolume } = useSound()

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBalls))
  }, [savedBalls])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('items')
    const name = params.get('name')
    const sound = params.get('sound')
    const bg = params.get('bg')
    const shell = params.get('shell')
    const core = params.get('core')
    if (encoded) {
      setItems(encoded.split(','))
      if (name) setBallName(name)
      if (sound && isSoundSetName(sound)) setSoundSet(sound)
      if (bg && isBackgroundId(bg)) setBackground(bg)
      if (shell && isHexColor(shell)) setShellColor(shell)
      if (core && isHexColor(core)) setCoreColor(core)
      setPlayMode('lottery')
      setMode('play')
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
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
    if (playMode === 'smash') {
      setResetKey(k => k + 1)
      return
    }
    if (items.length === 0) return
    setResult(items[Math.floor(Math.random() * items.length)])
    play('reveal')
  }, [items, play, playMode])

  // 부순 공으로는 다시 뽑을 수 없다 — 결과를 닫으면 새 공으로 갈아끼운다
  const newBall = (sound: 'click' | 'reset') => {
    setResult(null)
    setResetKey(k => k + 1)
    play(sound)
  }

  const resetColors = () => {
    setBackground(DEFAULT_BACKGROUND)
    setShellColor(DEFAULT_SHELL_COLOR)
    setCoreColor(DEFAULT_CORE_COLOR)
  }

  const saveBall = () => {
    const name = ballName.trim() || `왁뿌볼 #${savedBalls.length + 1}`
    const ball: SavedBall = {
      id: `ball-${Date.now()}`,
      name,
      items: [...items],
      createdAt: new Date().toISOString(),
      sound: soundSet,
      background,
      imageUrl: imageUrl ?? undefined,
      shellColor,
      coreColor,
    }
    setSavedBalls(prev => [ball, ...prev])
    setMode('board')
    setItems([])
    setBallName('')
    resetColors()
    setImageUrl(null)
    setResult(null)
  }

  const loadBall = (ball: {
    name: string
    items: readonly string[]
    sound?: SoundSetName
    background?: string
    imageUrl?: string
    shellColor?: string
    coreColor?: string
    mine?: boolean
  }) => {
    setItems([...ball.items])
    setBallName(ball.name)
    setSoundSet(ball.sound ?? 'classic')
    setBackground(ball.background ?? DEFAULT_BACKGROUND)
    setImageUrl(ball.imageUrl ?? null)
    setShellColor(ball.shellColor ?? DEFAULT_SHELL_COLOR)
    setCoreColor(ball.coreColor ?? DEFAULT_CORE_COLOR)
    setPlayMode(ball.items.length >= 2 ? 'lottery' : 'smash')
    setMode('play')
    setResult(null)
  }

  const deleteBall = (id: string) => {
    setSavedBalls(prev => prev.filter(b => b.id !== id))
  }

  const getShareUrl = () => {
    const base = window.location.origin + window.location.pathname
    const params = new URLSearchParams()
    if (items.length > 0) params.set('items', items.join(','))
    if (ballName.trim()) params.set('name', ballName.trim())
    if (soundSet !== 'classic') params.set('sound', soundSet)
    if (background !== DEFAULT_BACKGROUND) params.set('bg', background)
    if (shellColor !== DEFAULT_SHELL_COLOR) params.set('shell', shellColor)
    if (coreColor !== DEFAULT_CORE_COLOR) params.set('core', coreColor)
    return `${base}?${params.toString()}#/wakbbu`
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* non-HTTPS or permission denied — ignore silently */ }
  }

  if (mode === 'play') {
    return (
      <div className="custom-page dark">
        <div className="custom-create-header">
          <button
            className="btn-back"
            onClick={() => { setMode('board'); setItems([]); setBallName(''); resetColors(); setResult(null) }}
          >
            &larr; 목록
          </button>
          <h2 className="play-title">{ballName || '왁뿌볼'}</h2>
          <button className="btn-back" onClick={() => setMode('create')}>
            편집
          </button>
        </div>
        <div className="custom-scene">
          <BallScene
            background={background}
            textureUrl={imageUrl ?? undefined}
            shellColor={shellColor}
            coreColor={coreColor}
            ballSize={ballSize / 100}
            resetKey={resetKey}
            smashAt={playMode === 'lottery' ? 0.35 : SMASH_REVEAL_AT}
            onCracks={playCracks}
            onRubbing={setRubbing}
            onSmash={() => { play('smash'); handleSmash() }}
          />
          {playMode === 'lottery' && items.length < 2 && (
            <div className="scene-blocker">
              <p>아이템을 2개 이상 추가하세요</p>
            </div>
          )}
          {playMode === 'lottery' && result && (
            <div className="result-anchor">
              <motion.div
                className="custom-result-card"
                initial={{ scale: 0.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <h2>{result}</h2>
                <p className="result-sub">{ballName}에서 뽑혔습니다!</p>
                <div className="result-actions">
                  <button className="btn-retry" onClick={() => newBall('click')}>다시 뿌수기</button>
                  <button className="btn-share" onClick={copyShareLink}>
                    {copied ? '복사됨!' : '링크 복사'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
        {playMode === 'lottery' && (
          <div className="play-items-row">
            {items.map(item => (
              <span key={item} className="crew-item-chip">{item}</span>
            ))}
          </div>
        )}
        <Controls
          volume={volume}
          onVolumeChange={setVolume}
          ballSize={ballSize}
          onBallSizeChange={setBallSize}
          onReset={() => newBall('reset')}
        />
      </div>
    )
  }

  if (mode === 'board') {
    const boardBalls = [
      ...savedBalls.map(b => ({ ...b, author: undefined as string | undefined, mine: true })),
      ...CREW_BALLS.map(b => ({ ...b, items: [...b.items], sound: undefined, mine: false, imageUrl: undefined as string | undefined, shellColor: undefined as string | undefined, coreColor: undefined as string | undefined })),
    ]
      .filter(b => boardTab === 'all' || (boardTab === 'mine' ? b.mine : !b.mine))
      .filter(b => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.trim().toLowerCase()
        return (
          b.name.toLowerCase().includes(q) ||
          (b.author ?? '').toLowerCase().includes(q) ||
          b.items.some(item => item.toLowerCase().includes(q))
        )
      })

    return (
      <div className="custom-page">
        <div className="custom-header">
          <h1>왁뿌볼 게시판</h1>
          <button className="btn-new" onClick={() => setMode('create')}>
            + 새 왁뿌볼 만들기
          </button>
        </div>

        <div className="board-filter-row">
          <div className="board-tabs">
            {BOARD_TABS.map(tab => (
              <button
                key={tab.key}
                className={boardTab === tab.key ? 'active' : ''}
                onClick={() => setBoardTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="왁뿌볼 검색..."
            className="board-search"
          />
        </div>

        <div className="saved-grid">
          {boardBalls.length === 0 && (
            <p className="empty-text">
              {searchQuery ? '검색 결과가 없습니다' : '저장된 왁뿌볼이 없습니다. 새로 만들어보세요!'}
            </p>
          )}
          {boardBalls.map(ball => {
            const sc = ball.shellColor ?? DEFAULT_SHELL_COLOR
            const cc = ball.coreColor ?? DEFAULT_CORE_COLOR
            return (
              <div key={ball.id} className="saved-card" onClick={() => loadBall(ball)}>
                <div className="saved-card-preview">
                  {ball.imageUrl ? (
                    <img src={ball.imageUrl} alt="" className="saved-card-thumb" />
                  ) : (
                    <div
                      className="saved-card-ball"
                      style={{ background: `radial-gradient(circle at 35% 35%, ${sc}, ${cc} 80%)` }}
                    />
                  )}
                </div>
                <div className="saved-card-body">
                  <div className="saved-card-header">
                    <h3>{ball.name}</h3>
                    {ball.mine ? (
                      <button
                        className="btn-delete"
                        onClick={e => { e.stopPropagation(); deleteBall(ball.id) }}
                      >
                        &times;
                      </button>
                    ) : (
                      <span className="author-badge">{ball.author}</span>
                    )}
                  </div>
                  <div className="saved-items">
                    {ball.items.slice(0, 5).map(item => (
                      <span key={item} className="saved-item-chip">{item}</span>
                    ))}
                    {ball.items.length > 5 && (
                      <span className="saved-item-chip more">+{ball.items.length - 5}</span>
                    )}
                  </div>
                  <div className="saved-card-footer">
                    {ball.mine && ball.sound && ball.sound !== 'classic' && (
                      <span className="sound-badge">
                        {SOUND_SET_LIST.find(s => s.name === ball.sound)?.label}
                      </span>
                    )}
                    <p className="saved-date">{new Date(ball.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="custom-page dark">
      <div className="custom-create-header">
        <button
          className="btn-back"
          onClick={() => { setMode('board'); setItems([]); setBallName(''); setSoundSet('classic'); resetColors(); setImageUrl(null); setResult(null) }}
        >
          &larr; 목록
        </button>
        <input
          type="text"
          value={ballName}
          onChange={e => setBallName(e.target.value)}
          placeholder="왁뿌볼 이름"
          className="ball-name-input"
        />
        <button className="btn-share-header" onClick={copyShareLink}>
          {copied ? '복사됨!' : '공유 링크'}
        </button>
        <button className="btn-save" onClick={saveBall}>저장</button>
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
        {items.length > 0 && (
          <div className="item-chips">
            {items.map(item => (
              <span key={item} className="item-chip">
                {item}
                <button onClick={() => removeItem(item)}>&times;</button>
              </span>
            ))}
          </div>
        )}
        <div className="sound-set-row">
          <span className="sound-set-label">배경</span>
          {BACKGROUND_THEMES.map(t => (
            <button
              key={t.id}
              className={`sound-set-chip bg-chip${background === t.id ? ' selected' : ''}`}
              onClick={() => setBackground(t.id)}
            >
              <span className="bg-chip-swatch" style={{ background: t.gradient }} />
              {t.label}
            </button>
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
              {[set.emoji, set.label].filter(Boolean).join(' ')}
            </button>
          ))}
        </div>
        <div className="sound-set-row">
          <span className="sound-set-label">사진</span>
          <label className="sound-set-chip photo-upload-chip">
            {imageUrl ? '사진 변경' : '사진 추가'}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
          </label>
          {imageUrl && (
            <>
              <img src={imageUrl} alt="preview" className="photo-preview" />
              <button className="sound-set-chip" onClick={() => setImageUrl(null)}>삭제</button>
            </>
          )}
        </div>
        <BallColorPicker
          className="custom-colors"
          shellColor={shellColor}
          coreColor={coreColor}
          onShellChange={setShellColor}
          onCoreChange={setCoreColor}
        />
      </div>

      <div className="custom-scene">
        <BallScene
          background={background}
          textureUrl={imageUrl ?? undefined}
          shellColor={shellColor}
          coreColor={coreColor}
          resetKey={resetKey}
          smashAt={SMASH_REVEAL_AT}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={() => { play('smash'); handleSmash() }}
        />
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
                <button className="btn-retry" onClick={() => newBall('click')}>다시 뿌수기</button>
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
