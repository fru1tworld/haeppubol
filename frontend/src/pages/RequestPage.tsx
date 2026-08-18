import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { useSound } from '../audio/useSound'
import { SOUND_SET_LIST } from '../audio/soundSets'
import { PlayButtons } from '../components/PlayButtons'
import { BallCustomizer, type BallCustomization } from '../components/BallCustomizer'
import { SHELL_COLORS, CORE_COLORS } from '../three/ballColors'
import { getBackgroundTheme } from '../three/backgrounds'
import { getBaseUrl } from '../constants/baseUrl'
import { copyText } from '../utils/clipboard'
import { safeSetItem } from '../utils/image'
import './RequestPage.css'

const DEFAULT_SHELL = SHELL_COLORS[0].hex
const DEFAULT_CORE = CORE_COLORS[0].hex

interface WakRequest {
  id: string
  title: string
  author: string
  team: string
  message: string
  shellColor: string
  coreColor: string
  background: string
  createdAt: string
}

const STORAGE_KEY = 'wakbbuball-requests'

const DEFAULT_REQUESTS: WakRequest[] = [
  {
    id: 'seed-hr-1',
    title: '화장실 비누 어디있나요?',
    author: 'fritz',
    team: 'HR팀',
    message: '화장실 비누 보충 요청합니다',
    shellColor: '#F5C6A0',
    coreColor: '#D97B5A',
    background: 'peach',
    createdAt: '2026-08-06T09:00:00.000Z',
  },
  {
    id: 'seed-infra-1',
    title: 'Keycloak 비밀번호 초기화',
    author: 'sarah',
    team: 'Infra팀',
    message: 'Keycloak 비밀번호 초기화 부탁드립니다',
    shellColor: '#D1D5DB',
    coreColor: '#374151',
    background: 'mono',
    createdAt: '2026-08-07T02:00:00.000Z',
  },
  {
    id: 'seed-andy-1',
    title: '앤디 왁뿌볼',
    author: 'sarah',
    team: '',
    message: '',
    shellColor: '#A8D8EA',
    coreColor: '#3B82F6',
    background: 'sky',
    createdAt: '2026-08-07T03:00:00.000Z',
  },
]

const loadRequests = (): WakRequest[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_REQUESTS
    const parsed = JSON.parse(stored) as WakRequest[]
    return parsed.length ? parsed : DEFAULT_REQUESTS
  } catch {
    return DEFAULT_REQUESTS
  }
}

export const RequestPage = () => {
  const [requests, setRequests] = useState<WakRequest[]>(loadRequests)
  const [mode, setMode] = useState<'list' | 'create' | 'play'>('list')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [team, setTeam] = useState('')
  const [message, setMessage] = useState('')
  const [customization, setCustomization] = useState<BallCustomization>({
    shellColor: DEFAULT_SHELL,
    coreColor: DEFAULT_CORE,
    background: 'peach',
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [smashed, setSmashed] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [spinOn, setSpinOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const [playingReq, setPlayingReq] = useState<WakRequest | null>(null)
  const { play, playCracks, setRubbing, soundSet, setSoundSet } = useSound()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reqTitle = params.get('req_title')
    const reqTeam = params.get('req_team')
    const reqMsg = params.get('req_msg')
    if (reqTitle) {
      const parsed: WakRequest = {
        id: `shared-${Date.now()}`,
        title: reqTitle || '왁뿌볼 요청',
        author: '',
        team: reqTeam || '',
        message: reqMsg || '',
        shellColor: DEFAULT_SHELL,
        coreColor: DEFAULT_CORE,
        background: 'peach',
        createdAt: new Date().toISOString(),
      }
      setPlayingReq(parsed)
      setMode('play')
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    }
  }, [])

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(requests))
  }, [requests])

  const handleSmash = useCallback(() => {
    play('smash')
    setSmashed(true)
  }, [play])

  const getShareUrl = (req: WakRequest) => {
    const base = getBaseUrl()
    const params = new URLSearchParams()
    if (req.title) params.set('req_title', req.title)
    if (req.team) params.set('req_team', req.team)
    if (req.message) params.set('req_msg', req.message)
    return `${base}?${params.toString()}#/request`
  }

  const copyLink = async (req: WakRequest) => {
    const ok = await copyText(getShareUrl(req))
    if (!ok) return
    setCopiedId(req.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const saveRequest = () => {
    const req: WakRequest = {
      id: `req-${Date.now()}`,
      title: title.trim() || '왁뿌볼 요청',
      author: author.trim(),
      team: team.trim(),
      message: message.trim(),
      shellColor: customization.shellColor,
      coreColor: customization.coreColor,
      background: customization.background,
      createdAt: new Date().toISOString(),
    }
    setRequests(prev => [req, ...prev])
    setPlayingReq(req)
    setMode('play')
    setSmashed(false)
  }

  const playRequest = (req: WakRequest) => {
    setPlayingReq(req)
    setMode('play')
    setSmashed(false)
    setResetKey(k => k + 1)
  }

  const resetForm = () => {
    setMode('list')
    setTitle('')
    setAuthor('')
    setTeam('')
    setMessage('')
    setCustomization({ shellColor: DEFAULT_SHELL, coreColor: DEFAULT_CORE, background: 'peach' })
    setPlayingReq(null)
    setSmashed(false)
  }

  const deleteRequest = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  if (mode === 'play' && playingReq) {
    return (
      <div className="request-page play-mode">
        <div className="request-play-header">
          <button className="btn-back-req" onClick={resetForm}>&larr; 목록</button>
          <h2 className="play-req-title">왁뿌볼을 뿌셔서 확인하세요</h2>
          <button className="btn-copy-link" onClick={() => copyLink(playingReq)}>
            {copiedId === playingReq.id ? '복사됨!' : '링크 공유'}
          </button>
        </div>
        <div className="play-req-meta">
          {playingReq.author && <span className="play-req-from">from {playingReq.author}</span>}
          {playingReq.team && <span className="play-req-to">to {playingReq.team}</span>}
        </div>
        <div className="request-scene">
          <BallScene
            coreText={playingReq.message || playingReq.title}
            shellColor={playingReq.shellColor}
            coreColor={playingReq.coreColor}
            autoSpin={spinOn}
            freezeKey={freezeKey}
            resetKey={resetKey}
            smashAt={0.2}
            onCracks={playCracks}
            onRubbing={setRubbing}
            onSmash={handleSmash}
          />
          {smashed && (
            <div className="result-anchor">
              <motion.div
                className="request-result-card"
                initial={{ scale: 0.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <h2>{playingReq.title}</h2>
                {playingReq.message && <p className="result-sub">{playingReq.message}</p>}
                {(playingReq.author || playingReq.team) && (
                  <div className="result-from-to">
                    {playingReq.author && <span className="play-req-from">from {playingReq.author}</span>}
                    {playingReq.team && <span className="play-req-to">to {playingReq.team}</span>}
                  </div>
                )}
                <div className="result-actions">
                  <button className="btn-retry" onClick={() => { setSmashed(false); setResetKey(k => k + 1); play('click') }}>다시 뿌수기</button>
                  <button className="btn-copy-link" onClick={() => copyLink(playingReq)}>
                    {copiedId === playingReq.id ? '복사됨!' : '링크 공유'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          <PlayButtons
            frozen={frozen}
            spinOn={spinOn}
            onFreeze={() => { setFreezeKey(k => k + 1); setFrozen(true); setTimeout(() => setFrozen(false), 90_000) }}
            onToggleSpin={() => setSpinOn(v => !v)}
            onNewBall={() => { setSmashed(false); setResetKey(k => k + 1); play('reset') }}
          />
        </div>
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <div className="request-page">
        <div className="request-create">
          <div className="request-create-header">
            <button className="btn-back-req" onClick={resetForm}>&larr; 목록</button>
            <h2>왁뿌볼 요청 만들기</h2>
          </div>

          <div className="request-form">
            <label className="req-label">from (요청자)</label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="예: fritz"
              className="req-input"
            />

            <label className="req-label">to (받는 곳)</label>
            <input
              type="text"
              value={team}
              onChange={e => setTeam(e.target.value)}
              placeholder="예: Infra팀, HR팀"
              className="req-input"
            />

            <label className="req-label">요청사항</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: 점심 메뉴 추천해줘"
              className="req-input"
            />

            <label className="req-label">메시지 (선택)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="추가 메시지를 남겨주세요"
              className="req-textarea"
              rows={3}
            />

            <label className="req-label">소리</label>
            <div className="req-sound-row">
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

            <label className="req-label">왁뿌볼 커스텀</label>
            <BallCustomizer value={customization} onChange={setCustomization} />

            <button className="btn-save-req" onClick={saveRequest} disabled={!title.trim()}>
              저장하고 뿌수기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="request-page">
      <div className="request-header">
        <h1>왁뿌볼 요청사항</h1>
        <button className="btn-new-req" onClick={() => setMode('create')}>
          + 새 요청 만들기
        </button>
      </div>

      <p className="request-desc">왁뿌볼에 요구사항을 넣고 부숴서 결정하세요. 링크를 공유해서 크루에게 보낼 수 있습니다.</p>

      {requests.length === 0 && (
        <div className="request-empty">
          <p>아직 요청이 없습니다</p>
          <p>새 요청을 만들어 왁뿌볼을 뿌셔보세요</p>
        </div>
      )}

      <div className="request-list">
        {requests.map(req => (
          <div
            key={req.id}
            className="request-card"
            role="button"
            tabIndex={0}
            onClick={() => playRequest(req)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                playRequest(req)
              }
            }}
          >
            <div className="request-card-preview" style={{ background: getBackgroundTheme(req.background).gradient }}>
              <div
                className="saved-card-ball"
                style={{ background: `radial-gradient(circle at 35% 35%, ${req.shellColor || DEFAULT_SHELL}, ${req.coreColor || DEFAULT_CORE} 80%)` }}
              />
              <div className="preview-tags">
                {req.author && <span className="preview-tag from">from {req.author}</span>}
                {req.team && <span className="preview-tag to">to {req.team}</span>}
              </div>
            </div>
            <div className="request-card-body">
              <div className="request-card-header">
                <div className="request-card-meta">
                  {req.author && <span className="request-card-from">from {req.author}</span>}
                  {req.team && <span className="request-card-to">to {req.team}</span>}
                </div>
                <button className="btn-delete-req" aria-label={`${req.title} 삭제`} onClick={e => { e.stopPropagation(); deleteRequest(req.id) }}>&times;</button>
              </div>
              <div className="request-card-footer">
                <span className="request-date">{new Date(req.createdAt).toLocaleDateString('ko-KR')}</span>
                <button className="btn-copy-link" onClick={e => { e.stopPropagation(); copyLink(req) }}>
                  {copiedId === req.id ? '복사됨!' : '링크 공유'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
