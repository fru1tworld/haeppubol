import { useState, useCallback, useEffect } from 'react'
import { api } from '../api/client'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { useSound } from '../audio/useSound'
import './MinglePage.css'

const CUSTOM_KEY = 'wakbbu-mingle-custom'

const loadCustomItems = (): string[] | null => {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const MinglePage = () => {
  const [teams, setTeams] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [shareState, setShareState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [resetKey, setResetKey] = useState(0)
  const [customizing, setCustomizing] = useState(false)
  const [customItems, setCustomItems] = useState<string[] | null>(loadCustomItems)
  const [customInput, setCustomInput] = useState('')
  const { play, playCracks, setRubbing } = useSound()

  useEffect(() => {
    if (customItems) {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customItems))
    } else {
      localStorage.removeItem(CUSTOM_KEY)
    }
  }, [customItems])

  useEffect(() => {
    if (customItems && customItems.length > 0) {
      setTeams(customItems)
    }
  }, [customItems])

  const addTeam = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || teams.includes(trimmed)) return
    setTeams(prev => [...prev, trimmed])
    setInputValue('')
    play('pop')
  }

  const removeTeam = (team: string) => {
    setTeams(prev => prev.filter(t => t !== team))
  }

  const handleSmash = useCallback(() => {
    if (teams.length === 0) return
    setShareState('idle')
    setResult(teams[Math.floor(Math.random() * teams.length)])
    play('reveal')
  }, [teams, play])

  const handleShare = async () => {
    if (!result || shareState === 'sending' || shareState === 'done') return
    setShareState('sending')
    try {
      await api.share.mingle({ winner: result, teams: [...teams] })
      setShareState('done')
    } catch {
      setShareState('error')
    }
  }

  const handleRetry = () => {
    setResult(null)
    setResetKey(k => k + 1)
    play('click')
  }

  const addCustomItem = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    if (customItems?.includes(trimmed)) return
    const next = [...(customItems ?? []), trimmed]
    setCustomItems(next)
    setTeams(next)
    setCustomInput('')
    play('pop')
  }

  const removeCustomItem = (item: string) => {
    const next = (customItems ?? []).filter(i => i !== item)
    setCustomItems(next.length > 0 ? next : null)
    setTeams(next.length > 0 ? next : [])
  }

  const resetCustom = () => {
    setCustomItems(null)
    setTeams([])
    setCustomizing(false)
  }

  const canSmash = teams.length >= 2

  return (
    <div className="mingle-page">
      <div className="mingle-header-row">
        <h1 className="mingle-title">밍글 추첨 왁뿌볼</h1>
        <button
          className={`btn-customize${customizing ? ' active' : ''}`}
          onClick={() => setCustomizing(v => !v)}
        >
          {customizing ? '닫기' : '커스텀해보기'}
        </button>
      </div>

      {customizing ? (
        <div className="mingle-customize-panel">
          <div className="customize-input-row">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addCustomItem()}
              placeholder="팀/이름 입력"
              className="customize-input"
            />
            <button className="btn-customize-add" onClick={addCustomItem}>추가</button>
            {customItems && (
              <button className="btn-customize-reset" onClick={resetCustom}>초기화</button>
            )}
          </div>
          {customItems && customItems.length > 0 && (
            <div className="customize-chips">
              {customItems.map(item => (
                <span key={item} className="customize-chip">
                  {item}
                  <button onClick={() => removeCustomItem(item)}>&times;</button>
                </span>
              ))}
            </div>
          )}
          {customItems && (
            <p className="customize-hint">저장된 커스텀 목록에서 추첨됩니다</p>
          )}
        </div>
      ) : (
        <div className="team-input-area">
          <div className="team-input-row">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addTeam()}
              placeholder="팀 이름 입력"
              className="team-input"
            />
            <button className="btn-add" onClick={addTeam}>추가</button>
          </div>
          {teams.length > 0 && (
            <div className="team-chips">
              {teams.map(team => (
                <span key={team} className="team-chip">
                  {team}
                  <button onClick={() => removeTeam(team)}>&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mingle-scene">
        <BallScene
          resetKey={resetKey}
          smashAt={SMASH_REVEAL_AT}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={() => { play('smash'); handleSmash() }}
        />
        {!canSmash && (
          <div className="scene-blocker">
            <p>팀을 2개 이상 추가하세요</p>
          </div>
        )}
        {result && (
          <div className="result-anchor">
            <motion.div
              className="mingle-result-card"
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <div className="confetti-text">당첨</div>
              <h2 className="winner-name">{result}</h2>
              <div className="participant-list">
                <p className="participant-label">참여 팀</p>
                <div className="participant-chips">
                  {teams.map(team => (
                    <span
                      key={team}
                      className={`participant-chip ${team === result ? 'winner' : ''}`}
                    >
                      {team}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className={`btn-share ${shareState}`}
                onClick={handleShare}
                disabled={shareState === 'sending' || shareState === 'done'}
              >
                {{ idle: '슬랙 공유', sending: '전송 중...', done: '공유 완료', error: '전송 실패 - 다시 시도' }[shareState]}
              </button>
              <button className="btn-retry" onClick={handleRetry}>다시 추첨</button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
