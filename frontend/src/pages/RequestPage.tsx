import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { useSound } from '../audio/useSound'
import { PlayButtons } from '../components/PlayButtons'
import { getBaseUrl } from '../constants/baseUrl'
import './RequestPage.css'

interface WakRequest {
  id: string
  title: string
  team: string
  message: string
  createdAt: string
}

const STORAGE_KEY = 'wakbbuball-requests'

const loadRequests = (): WakRequest[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export const RequestPage = () => {
  const [requests, setRequests] = useState<WakRequest[]>(loadRequests)
  const [mode, setMode] = useState<'list' | 'create' | 'play'>('list')
  const [title, setTitle] = useState('')
  const [team, setTeam] = useState('')
  const [message, setMessage] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [smashed, setSmashed] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [spinOn, setSpinOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const [playingReq, setPlayingReq] = useState<WakRequest | null>(null)
  const { play, playCracks, setRubbing } = useSound()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reqTitle = params.get('req_title')
    const reqTeam = params.get('req_team')
    const reqMsg = params.get('req_msg')
    if (reqTitle) {
      const parsed: WakRequest = {
        id: `shared-${Date.now()}`,
        title: reqTitle || '왁뿌볼 요청',
        team: reqTeam || '',
        message: reqMsg || '',
        createdAt: new Date().toISOString(),
      }
      setPlayingReq(parsed)
      setMode('play')
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
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
    try {
      await navigator.clipboard.writeText(getShareUrl(req))
      setCopiedId(req.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* non-HTTPS or permission denied */ }
  }

  const saveRequest = () => {
    const req: WakRequest = {
      id: `req-${Date.now()}`,
      title: title.trim() || '왁뿌볼 요청',
      team: team.trim(),
      message: message.trim(),
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
    setTeam('')
    setMessage('')
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
          <h2 className="play-req-title">{playingReq.title}</h2>
          <button className="btn-copy-link" onClick={() => copyLink(playingReq)}>
            {copiedId === playingReq.id ? '복사됨!' : '링크 공유'}
          </button>
        </div>
        {playingReq.team && (
          <p className="play-req-team">요청팀: {playingReq.team}</p>
        )}
        <div className="request-scene">
          <BallScene
            coreText={playingReq.message || playingReq.title}
            autoSpin={spinOn}
            freezeKey={freezeKey}
            resetKey={resetKey}
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
                {playingReq.team && <p className="result-team">from {playingReq.team}</p>}
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
            <label className="req-label">요청팀</label>
            <input
              type="text"
              value={team}
              onChange={e => setTeam(e.target.value)}
              placeholder="예: 프론트엔드팀"
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
          <div key={req.id} className="request-card" onClick={() => playRequest(req)}>
            <div className="request-card-header">
              <div>
                <h3>{req.title}</h3>
                {req.team && <span className="request-card-team">{req.team}</span>}
              </div>
              <button className="btn-delete-req" onClick={e => { e.stopPropagation(); deleteRequest(req.id) }}>&times;</button>
            </div>
            {req.message && <p className="request-card-msg">{req.message}</p>}
            <div className="request-card-footer">
              <span className="request-date">{new Date(req.createdAt).toLocaleDateString('ko-KR')}</span>
              <button className="btn-copy-link" onClick={e => { e.stopPropagation(); copyLink(req) }}>
                {copiedId === req.id ? '복사됨!' : '링크 공유'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
