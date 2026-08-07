import { useState, useEffect } from 'react'
import './RequestPage.css'

interface WakRequest {
  id: string
  title: string
  items: string[]
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
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reqTitle = params.get('req_title')
    const reqItems = params.get('req_items')
    const reqMsg = params.get('req_msg')
    if (reqTitle || reqItems) {
      setTitle(reqTitle || '')
      setMessage(reqMsg || '')
      if (reqItems) setItems(reqItems.split(',').map(decodeURIComponent))
      setIsCreating(true)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  }, [requests])

  const addItem = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || items.includes(trimmed)) return
    setItems(prev => [...prev, trimmed])
    setInputValue('')
  }

  const removeItem = (item: string) => {
    setItems(prev => prev.filter(i => i !== item))
  }

  const getShareUrl = (req: WakRequest) => {
    const base = window.location.origin + window.location.pathname
    const params = new URLSearchParams()
    if (req.title) params.set('req_title', req.title)
    if (req.items.length > 0) params.set('req_items', req.items.map(encodeURIComponent).join(','))
    if (req.message) params.set('req_msg', req.message)
    return `${base}?${params.toString()}#/request`
  }

  const copyLink = async (req: WakRequest) => {
    await navigator.clipboard.writeText(getShareUrl(req))
    setCopiedId(req.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const saveRequest = () => {
    const req: WakRequest = {
      id: `req-${Date.now()}`,
      title: title.trim() || '왁뿌볼 요청',
      items: [...items],
      message: message.trim(),
      createdAt: new Date().toISOString(),
    }
    setRequests(prev => [req, ...prev])
    resetForm()
  }

  const deleteRequest = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  const resetForm = () => {
    setIsCreating(false)
    setTitle('')
    setMessage('')
    setItems([])
    setInputValue('')
  }

  if (isCreating) {
    return (
      <div className="request-page">
        <div className="request-create">
          <div className="request-create-header">
            <button className="btn-back-req" onClick={resetForm}>&larr; 목록</button>
            <h2>왁뿌볼 요청 만들기</h2>
          </div>

          <div className="request-form">
            <label className="req-label">제목</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: 점심 메뉴 추천해줘"
              className="req-input"
            />

            <label className="req-label">요청 항목</label>
            <div className="req-item-row">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addItem()}
                placeholder="항목 입력 후 추가"
                className="req-input"
              />
              <button className="btn-add-req" onClick={addItem}>추가</button>
            </div>
            {items.length > 0 && (
              <div className="req-chips">
                {items.map(item => (
                  <span key={item} className="req-chip">
                    {item}
                    <button onClick={() => removeItem(item)}>&times;</button>
                  </span>
                ))}
              </div>
            )}

            <label className="req-label">메시지 (선택)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="추가 메시지를 남겨주세요"
              className="req-textarea"
              rows={3}
            />

            <button className="btn-save-req" onClick={saveRequest} disabled={!title.trim() && items.length === 0}>
              저장하고 링크 만들기
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
        <button className="btn-new-req" onClick={() => setIsCreating(true)}>
          + 새 요청 만들기
        </button>
      </div>

      <p className="request-desc">공유 링크를 만들어 크루에게 왁뿌볼 요청을 보내세요</p>

      {requests.length === 0 && (
        <div className="request-empty">
          <p>아직 요청이 없습니다</p>
          <p>새 요청을 만들어 공유 링크를 생성해보세요</p>
        </div>
      )}

      <div className="request-list">
        {requests.map(req => (
          <div key={req.id} className="request-card">
            <div className="request-card-header">
              <h3>{req.title}</h3>
              <button className="btn-delete-req" onClick={() => deleteRequest(req.id)}>&times;</button>
            </div>
            {req.items.length > 0 && (
              <div className="request-card-items">
                {req.items.map(item => (
                  <span key={item} className="req-item-badge">{item}</span>
                ))}
              </div>
            )}
            {req.message && <p className="request-card-msg">{req.message}</p>}
            <div className="request-card-footer">
              <span className="request-date">{new Date(req.createdAt).toLocaleDateString('ko-KR')}</span>
              <button className="btn-copy-link" onClick={() => copyLink(req)}>
                {copiedId === req.id ? '복사됨!' : '링크 복사'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
