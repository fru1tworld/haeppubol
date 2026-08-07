import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { useSound } from '../audio/useSound'
import { PlayButtons } from '../components/PlayButtons'
import { api } from '../api/client'
import { PICK_COUNT, pickSome } from '../constants/mingleRule'
import './MinglePage.css'

export const MinglePage = () => {
  const [teams, setTeams] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<string[] | null>(null)
  const [shareState, setShareState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [resetKey, setResetKey] = useState(0)
  const [sealed, setSealed] = useState<string[]>([])
  const [spinOn, setSpinOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const { play, playCracks, setRubbing } = useSound()

  useEffect(() => {
    api.mingleTeams.list()
      .then(setTeams)
      .catch(() => {})
  }, [])

  // 공 안에 미리 넣어두는 당첨 팀들. 부술수록 이름이 비쳐 보인다
  useEffect(() => {
    setSealed(pickSome(teams, PICK_COUNT))
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
    const winners = sealed.length ? sealed : pickSome(teams, PICK_COUNT)
    if (winners.length === 0) return
    setShareState('idle')
    setResult(winners)
    play('reveal')
  }, [sealed, teams, play])

  const handleShare = async () => {
    if (!result || shareState === 'sending' || shareState === 'done') return
    setShareState('sending')
    try {
      const text = [
        `[밍글 추첨 왁뿌볼] 선정: ${result.join(', ')}`,
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

      <p className="mingle-rule">매달 {PICK_COUNT}팀을 뽑습니다.</p>

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
          coreText={canSmash && sealed.length ? sealed.join(' · ') : undefined}
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
              <h2 className="winner-name">{result.join(' · ')}</h2>
              <div className="participant-list">
                <p className="participant-label">참여 팀</p>
                <div className="participant-chips">
                  {teams.map(team => (
                    <span
                      key={team}
                      className={`participant-chip ${result.includes(team) ? 'winner' : ''}`}
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
