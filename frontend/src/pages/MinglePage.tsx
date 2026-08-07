import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { useSound } from '../audio/useSound'
import { PlayButtons } from '../components/PlayButtons'
import { api } from '../api/client'
import './MinglePage.css'

export const MinglePage = () => {
  const [teams, setTeams] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [shareState, setShareState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [resetKey, setResetKey] = useState(0)
  const [sealed, setSealed] = useState<string | null>(null)
  const [spinOn, setSpinOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const { play, playCracks, setRubbing } = useSound()

  useEffect(() => {
    api.mingleTeams.list()
      .then(setTeams)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setSealed(teams.length ? teams[Math.floor(Math.random() * teams.length)] : null)
  }, [teams, resetKey])

  const addTeam = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || teams.includes(trimmed)) return
    setTeams(prev => [...prev, trimmed])
    setInputValue('')
    play('pop')
    api.mingleTeams.add(trimmed).catch(() => {})
  }

  const removeTeam = (team: string) => {
    const pw = prompt('어드민 비밀번호를 입력하세요')
    if (pw !== 'fritz123') {
      alert('비밀번호가 틀렸습니다')
      return
    }
    setTeams(prev => prev.filter(t => t !== team))
    api.mingleTeams.remove(team).catch(() => {})
  }

  const handleSmash = useCallback(() => {
    if (teams.length === 0) return
    setShareState('idle')
    setResult(sealed ?? teams[Math.floor(Math.random() * teams.length)])
    play('reveal')
  }, [teams, sealed, play])

  const handleShare = async () => {
    if (!result || shareState === 'sending' || shareState === 'done') return
    setShareState('sending')
    try {
      const text = [
        `[밍글 추첨 왁뿌볼] 당첨: ${result}`,
        `참여: ${teams.join(', ')}`,
      ].join('\n')
      await navigator.clipboard.writeText(text)
      window.open('slack://open', '_blank')
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

  const canSmash = teams.length >= 2

  return (
    <div className="mingle-page">
      <div className="mingle-header-row">
        <h1 className="mingle-title">밍글 추첨 왁뿌볼</h1>
      </div>

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

      <div className="mingle-scene">
        <BallScene
          resetKey={resetKey}
          autoSpin={spinOn}
          freezeKey={freezeKey}
          smashAt={SMASH_REVEAL_AT}
          coreText={canSmash ? sealed ?? undefined : undefined}
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
        <PlayButtons
          frozen={frozen}
          spinOn={spinOn}
          onFreeze={() => { setFreezeKey(k => k + 1); setFrozen(true); setTimeout(() => setFrozen(false), 90_000) }}
          onToggleSpin={() => setSpinOn(v => !v)}
          onNewBall={handleRetry}
        />
      </div>
    </div>
  )
}
