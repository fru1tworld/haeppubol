import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { useSound } from '../audio/useSound'
import './MinglePage.css'

export const MinglePage = () => {
  const [teams, setTeams] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const { play } = useSound()

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
    setResult(teams[Math.floor(Math.random() * teams.length)])
    play('reveal')
  }, [teams, play])

  const handleRetry = () => {
    setResult(null)
    play('click')
  }

  const canSmash = teams.length >= 2

  return (
    <div className="mingle-page">
      <h1 className="mingle-title">밍글 추첨 왁뿌볼</h1>

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
        <div className="team-chips">
          {teams.map(team => (
            <span key={team} className="team-chip">
              {team}
              <button onClick={() => removeTeam(team)}>&times;</button>
            </span>
          ))}
        </div>
      </div>

      <div className="mingle-scene">
        <BallScene layers={1} pressSpeed={4.5} onChunk={() => play('pop')} onSmash={() => { play('smash'); handleSmash() }} />
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
              <button className="btn-retry" onClick={handleRetry}>다시 추첨</button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
