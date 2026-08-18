import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { useSound } from '../audio/useSound'
import { SOUND_SET_LIST } from '../audio/soundSets'
import type { SoundSetName } from '../audio/soundSets'
import { BACKGROUND_THEMES, DEFAULT_BACKGROUND, isBackgroundId } from '../three/backgrounds'
import { BallColorPicker } from '../components/BallColorPicker'
import { Controls, initialBallSize } from '../components/Controls'
import { PlayButtons } from '../components/PlayButtons'
import { DEFAULT_CORE_COLOR, DEFAULT_SHELL_COLOR, isHexColor } from '../three/ballColors'
import { DEFAULT_FACE_OPACITY } from '../three/WaxBall'
import { getBaseUrl } from '../constants/baseUrl'
import { copyText } from '../utils/clipboard'
import { fileToDataUrl, safeSetItem } from '../utils/image'
import { useImmersive } from '../hooks/useImmersive'
import './CustomPage.css'

const hashCode = (str: string): number => {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return h
}

const randomShellColor = (id: string): string => {
  const h = ((hashCode(id) % 360) + 360) % 360
  return `hsl(${h}, 65%, 82%)`
}

const randomCoreColor = (id: string): string => {
  const h = ((hashCode(id + '_core') % 360) + 360) % 360
  return `hsl(${h}, 60%, 45%)`
}

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
  faceOpacity?: number
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

type PageMode = 'create' | 'board'

export const CustomPage = ({
  mode: pageMode,
}: {
  mode: PageMode
}) => {
  const [items, setItems] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [ballName, setBallName] = useState('')
  const [boardTab, setBoardTab] = useState<BoardTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [savedBalls, setSavedBalls] = useState<SavedBall[]>(loadSavedBalls)
  const [background, setBackground] = useState(DEFAULT_BACKGROUND)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [faceOpacity, setFaceOpacity] = useState(DEFAULT_FACE_OPACITY)
  const [shellColor, setShellColor] = useState(DEFAULT_SHELL_COLOR)
  const [coreColor, setCoreColor] = useState(DEFAULT_CORE_COLOR)
  const [view, setView] = useState<'main' | 'play'>(pageMode === 'board' ? 'main' : 'main')
  const [playMode, setPlayMode] = useState<'lottery' | 'smash'>('lottery')
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [sealed, setSealed] = useState<string | null>(null)
  const [ballSize, setBallSize] = useState(initialBallSize)
  const [slackState, setSlackState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [spinOn, setSpinOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const [tagline, setTagline] = useState<string | null>(null)
  const [lotteryOpenManual, setLotteryOpenManual] = useState(false)
  const { play, playCracks, setRubbing, soundSet, setSoundSet, volume, setVolume, muted, toggleMute } = useSound()

  // 아이템이 있으면 뽑기 UI는 항상 열려 있어야 한다 (공유 링크로 아이템이 주입되는 경우 포함)
  const lotteryOpen = lotteryOpenManual || items.length > 0

  // 부수는 화면에선 상단 헤더를 접고 넓게 쓴다
  useImmersive(view === 'play')

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    fileToDataUrl(file).then(setImageUrl).catch(() => {})
  }

  const [crewBalls, setCrewBalls] = useState<SavedBall[]>([])

  useEffect(() => {
    api.crewBalls.list()
      .then(balls => setCrewBalls(balls.map(b => ({
        id: b.id,
        name: b.name,
        items: b.items,
        createdAt: b.createdAt,
        author: b.author,
        sound: (b.sound && isSoundSetName(b.sound) ? b.sound : undefined),
        background: b.background ?? undefined,
        imageUrl: b.photo ?? undefined,
        shellColor: b.shellColor ?? undefined,
        coreColor: b.coreColor ?? undefined,
      }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(savedBalls))
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
      setView('play')
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

  useEffect(() => {
    setSealed(items.length ? items[Math.floor(Math.random() * items.length)] : null)
  }, [items, resetKey])

  const handleSmash = useCallback(() => {
    if (playMode === 'smash') {
      setResetKey(k => k + 1)
      return
    }
    if (items.length === 0) return
    setResult(sealed ?? items[Math.floor(Math.random() * items.length)])
    play('reveal')
  }, [items, sealed, play, playMode])

  const newBall = (sound: 'click' | 'reset') => {
    setResult(null)
    setSlackState('idle')
    setResetKey(k => k + 1)
    play(sound)
  }

  const shareToSlack = async () => {
    if (!result || slackState === 'sending' || slackState === 'done') return
    setSlackState('sending')
    try {
      await api.share.custom({
        ballName: ballName || '왁뿌볼',
        result,
        items,
      })
      setSlackState('done')
    } catch {
      setSlackState('error')
    }
  }

  const resetColors = () => {
    setFaceOpacity(DEFAULT_FACE_OPACITY)
    setBackground(DEFAULT_BACKGROUND)
    setShellColor(DEFAULT_SHELL_COLOR)
    setCoreColor(DEFAULT_CORE_COLOR)
  }

  const saveBall = async () => {
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
      faceOpacity,
    }
    setSavedBalls(prev => [ball, ...prev])
    api.crewBalls.create({
      name,
      author: 'me',
      items: [...items],
      shellColor,
      coreColor,
      background,
      sound: soundSet,
      photo: imageUrl ?? undefined,
    }).catch(() => {})
    setItems([])
    setBallName('')
    resetColors()
    setImageUrl(null)
    setResult(null)
    window.location.hash = '/crew'
  }

  const loadBall = (ball: {
    name: string
    items: readonly string[]
    sound?: SoundSetName
    background?: string
    imageUrl?: string
    shellColor?: string
    coreColor?: string
    faceOpacity?: number
    mine?: boolean
    tagline?: string
    healMode?: boolean
  }) => {
    setItems([...ball.items])
    setBallName(ball.name)
    setSoundSet(ball.sound ?? 'slime')
    setBackground(ball.background ?? DEFAULT_BACKGROUND)
    setImageUrl(ball.imageUrl ?? null)
    setFaceOpacity(ball.faceOpacity ?? DEFAULT_FACE_OPACITY)
    setShellColor(ball.shellColor ?? DEFAULT_SHELL_COLOR)
    setCoreColor(ball.coreColor ?? DEFAULT_CORE_COLOR)
    setPlayMode(ball.items.length >= 2 ? 'lottery' : 'smash')
    setTagline(ball.tagline ?? null)
    setSpinOn(!!ball.healMode)
    setFrozen(false)
    setView('play')
    setResult(null)
  }

  const deleteBall = (id: string) => {
    setSavedBalls(prev => prev.filter(b => b.id !== id))
  }

  const getShareUrl = () => {
    const base = getBaseUrl()
    const params = new URLSearchParams()
    if (items.length > 0) params.set('items', items.join(','))
    if (ballName.trim()) params.set('name', ballName.trim())
    if (soundSet !== 'slime') params.set('sound', soundSet)
    if (background !== DEFAULT_BACKGROUND) params.set('bg', background)
    if (shellColor !== DEFAULT_SHELL_COLOR) params.set('shell', shellColor)
    if (coreColor !== DEFAULT_CORE_COLOR) params.set('core', coreColor)
    return `${base}?${params.toString()}#/wakbbu`
  }

  const copyShareLink = async () => {
    const ok = await copyText(getShareUrl())
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFreeze = () => {
    setFreezeKey(k => k + 1)
    setFrozen(true)
    setTimeout(() => setFrozen(false), 90_000)
  }

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    fileToDataUrl(file)
      .then(url => {
        setImageUrl(url)
        setResetKey(k => k + 1)
      })
      .catch(() => {})
  }

  const backFromPlay = () => {
    if (pageMode === 'create') {
      setView('main')
      setResult(null)
      setTagline(null)
      setSpinOn(false)
      setFrozen(false)
    } else {
      setView('main')
      setItems([])
      setBallName('')
      resetColors()
      setResult(null)
      setTagline(null)
      setSpinOn(false)
      setFrozen(false)
    }
  }

  if (view === 'play') {
    const isHeal = playMode === 'smash' && items.length === 0

    return (
      <div className="custom-page dark">
        <div className="custom-create-header">
          <button className="btn-back" onClick={backFromPlay}>
            &larr; {pageMode === 'create' ? '만들기' : '목록'}
          </button>
          <h2 className="play-title">{ballName || '왁뿌볼'}</h2>
          <div className="play-header-actions">
            <label className="btn-back play-face-btn">
              얼굴 사진
              <input type="file" accept="image/*" onChange={handleFaceUpload} hidden />
            </label>
            {pageMode === 'create' && (
              <button className="btn-back" onClick={() => setView('main')}>
                편집
              </button>
            )}
          </div>
        </div>
        {tagline && <p className="play-tagline">{tagline}</p>}
        <div className="custom-scene">
          <BallScene
            background={background}
            faceUrl={imageUrl ?? undefined}
            faceOpacity={faceOpacity}
            coreText={sealed ?? undefined}
            shellColor={shellColor}
            coreColor={coreColor}
            ballSize={ballSize / 100}
            autoSpin={spinOn}
            freezeKey={freezeKey}
            resetKey={resetKey}
            smashAt={playMode === 'lottery' ? 0.35 : SMASH_REVEAL_AT}
            onCracks={playCracks}
            onRubbing={setRubbing}
            onSmash={() => { play('smash'); handleSmash() }}
          />
          {isHeal && (
            <p className="play-hint">드래그해서 돌리고, 꾹 눌러서 뿌수세요</p>
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
                  <button
                    className={`btn-slack ${slackState}`}
                    onClick={shareToSlack}
                    disabled={slackState === 'sending' || slackState === 'done'}
                  >
                    {slackState === 'idle' ? '슬랙 공유' : slackState === 'sending' ? '전송 중...' : slackState === 'done' ? '공유 완료' : '다시 시도'}
                  </button>
                  <button className="btn-share" onClick={copyShareLink}>
                    {copied ? '복사됨!' : '링크 복사'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          <Controls
            volume={volume}
            onVolumeChange={setVolume}
            muted={muted}
            onToggleMute={toggleMute}
            ballSize={ballSize}
            onBallSizeChange={setBallSize}
            onReset={() => newBall('reset')}
            faceOpacity={imageUrl ? faceOpacity : undefined}
            onFaceOpacityChange={setFaceOpacity}
          />
          <PlayButtons
            frozen={frozen}
            spinOn={spinOn}
            onFreeze={handleFreeze}
            onToggleSpin={() => setSpinOn(v => !v)}
            onNewBall={() => newBall('reset')}
          />
        </div>
        {playMode === 'lottery' && (
          <div className="play-items-row">
            {items.map(item => (
              <span key={item} className="crew-item-chip">{item}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (pageMode === 'board') {
    const boardBalls = [
      ...savedBalls.map(b => ({ ...b, author: undefined as string | undefined, mine: true })),
      ...crewBalls.map(b => ({ ...b, mine: false, shellColor: b.shellColor ?? randomShellColor(b.id), coreColor: b.coreColor ?? randomCoreColor(b.id) })),
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
          <div>
            <h1>크루볼 게시판</h1>
            <p className="board-description">크루들이 만든 왁뿌볼을 구경하세요</p>
          </div>
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
              {searchQuery ? '검색 결과가 없습니다' : '저장된 왁뿌볼이 없습니다. 수제 왁뿌볼 만들기에서 새로 만들어보세요!'}
            </p>
          )}
          {boardBalls.map(ball => {
            const sc = ball.shellColor ?? randomShellColor(ball.id)
            const cc = ball.coreColor ?? randomCoreColor(ball.id)
            return (
              <div
                key={ball.id}
                className="saved-card"
                role="button"
                tabIndex={0}
                onClick={() => loadBall(ball)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    loadBall(ball)
                  }
                }}
              >
                <div className="saved-card-preview">
                  {ball.imageUrl ? (
                    <img src={ball.imageUrl} alt="" className="saved-card-thumb" />
                  ) : (
                    <div
                      className="saved-card-ball"
                      style={{ background: `radial-gradient(circle at 35% 35%, ${sc}, ${cc} 80%)` }}
                    />
                  )}
                  <div className="preview-tags">
                    <span className="preview-tag">{ball.items.length >= 2 ? '뽑기' : '일반'}</span>
                    {ball.sound && ball.sound !== 'slime' && (
                      <span className="preview-tag sound">{SOUND_SET_LIST.find(s => s.name === ball.sound)?.label}</span>
                    )}
                  </div>
                </div>
                <div className="saved-card-body">
                  <div className="saved-card-header">
                    <h3>{ball.name}</h3>
                    {ball.mine ? (
                      <button
                        className="btn-delete"
                        aria-label={`${ball.name} 삭제`}
                        onClick={e => { e.stopPropagation(); deleteBall(ball.id) }}
                      >
                        &times;
                      </button>
                    ) : (
                      <span className="author-badge">{ball.author}</span>
                    )}
                  </div>
                  {'tagline' in ball && (ball as { tagline?: string }).tagline ? (
                    <p className="saved-card-tagline">{(ball as { tagline?: string }).tagline}</p>
                  ) : (
                    <div className="saved-items">
                      {ball.items.slice(0, 5).map(item => (
                        <span key={item} className="saved-item-chip">{item}</span>
                      ))}
                      {ball.items.length > 5 && (
                        <span className="saved-item-chip more">+{ball.items.length - 5}</span>
                      )}
                    </div>
                  )}
                  <div className="saved-card-footer">
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
        <h2 className="play-title">수제 왁뿌볼 만들기</h2>
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
        <div className="ball-type-tags create-mode-tags">
          <button
            className={`ball-type-tag${items.length < 2 ? ' active' : ''}`}
            onClick={() => { play('pop'); setLotteryOpenManual(false); setItems([]); setInputValue('') }}
          >
            일반
          </button>
          <button
            className={`ball-type-tag${items.length >= 2 ? ' active' : ''}`}
            onClick={() => { play('pop'); setLotteryOpenManual(true) }}
          >
            뽑기
          </button>
          {soundSet !== 'slime' && (
            <span className="ball-type-tag active sound">{SOUND_SET_LIST.find(s => s.name === soundSet)?.label}</span>
          )}
        </div>
        {lotteryOpen && (
          <>
            <div className="item-input-row">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addItem()}
                placeholder="뽑기 아이템 입력"
                className="item-input"
              />
              <button className="btn-add" onClick={addItem}>추가</button>
            </div>
            {items.length > 0 && (
              <div className="item-chips">
                {items.map(item => (
                  <span key={item} className="item-chip">
                    {item}
                    <button aria-label={`${item} 삭제`} onClick={() => removeItem(item)}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </>
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
          faceUrl={imageUrl ?? undefined}
            faceOpacity={faceOpacity}
          coreText={sealed ?? undefined}
          shellColor={shellColor}
          coreColor={coreColor}
          ballSize={ballSize / 100}
          autoSpin={spinOn}
          freezeKey={freezeKey}
          resetKey={resetKey}
          smashAt={SMASH_REVEAL_AT}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={() => { play('smash'); handleSmash() }}
        />
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
        <Controls
          volume={volume}
          onVolumeChange={setVolume}
          muted={muted}
          onToggleMute={toggleMute}
          ballSize={ballSize}
          onBallSizeChange={setBallSize}
          onReset={() => newBall('reset')}
        />
        <PlayButtons
          frozen={frozen}
          spinOn={spinOn}
          onFreeze={handleFreeze}
          onToggleSpin={() => setSpinOn(v => !v)}
          onNewBall={() => newBall('reset')}
        />
      </div>
    </div>
  )
}
