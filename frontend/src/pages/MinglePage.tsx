import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BallScene } from '../three/BallScene'
import { SMASH_REVEAL_AT } from '../three/waxPhysics'
import { useSound } from '../audio/useSound'
import { Controls, initialBallSize } from '../components/Controls'
import { PlayButtons } from '../components/PlayButtons'
import { BallCustomizer, type BallCustomization } from '../components/BallCustomizer'
import { SOUND_SET_LIST } from '../audio/soundSets'
import { api } from '../api/client'
import { PageTabs } from '../components/PageTabs'
import { PICK_COUNT, pickSome } from '../constants/mingleRule'

import './MinglePage.css'

type ActiveTab = 'list' | 'custom' | null

const DEFAULT_TEAMS = ['시네마', '풋살', '볼링', 'N데이', '런닝']

interface DrawHistory {
  month: string
  first: string
  second: string
}

const PAST_DRAWS: DrawHistory[] = [
  { month: '2026년 7월', first: '볼링', second: '풋살' },
  { month: '2026년 6월', first: '랜덤런치', second: '(전사 참여)' },
  { month: '2026년 5월', first: 'N데이', second: '피클볼' },
]

export const MinglePage = () => {
  const [teams, setTeams] = useState<string[]>(DEFAULT_TEAMS)
  const [inputValue, setInputValue] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveTab>(null)
  const [editing, setEditing] = useState(false)
  const [customization, setCustomization] = useState<BallCustomization>({
    shellColor: '#F5C6A0',
    coreColor: '#D97B5A',
    background: 'peach',
  })
  const [result, setResult] = useState<string[] | null>(null)
  const [shareState, setShareState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [resetKey, setResetKey] = useState(0)
  const [sealed, setSealed] = useState<string[]>([])
  const [spinOn, setSpinOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [freezeKey, setFreezeKey] = useState(0)
  const [ballSize, setBallSize] = useState(initialBallSize)
  const { play, playCracks, setRubbing, soundSet, setSoundSet, volume, setVolume, muted, toggleMute } = useSound()

  useEffect(() => {
    api.mingleTeams.list()
      .then(setTeams)
      .catch(() => {})
  }, [])

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
    if (!result?.length || shareState === 'sending' || shareState === 'done') return
    setShareState('sending')
    try {
      await api.share.mingle({ winner: result.join(', '), teams })
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

  const canSmash = teams.length >= PICK_COUNT

  return (
    <div className="mingle-page">
      <PageTabs tabs={[
        { label: '리스트', active: activeTab === 'list', onClick: () => { setActiveTab(v => v === 'list' ? null : 'list'); setEditing(false) } },
        { label: '왁뿌볼 커스텀하기', active: activeTab === 'custom', onClick: () => setActiveTab(v => v === 'custom' ? null : 'custom') },
      ]} />

      {activeTab === 'list' && (
        <div className="list-panel">
          <div className="list-panel-header">
            <span className="list-count">{teams.length}개 활동 · 매달 {PICK_COUNT}팀 추첨</span>
            <button className="btn-edit-toggle" onClick={() => setEditing(v => !v)}>
              {editing ? '완료' : '편집'}
            </button>
          </div>

          {editing && (
            <div className="add-form">
              <div className="add-form-row">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addTeam()}
                  placeholder="밍글 활동 입력 (예: 볼링, 풋살)"
                  className="add-form-input"
                />
                <button className="btn-add-row" onClick={addTeam} disabled={!inputValue.trim()}>추가</button>
              </div>
            </div>
          )}

          <div className="list-table-wrap">
            <table className="list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>활동명</th>
                  {editing && <th></th>}
                </tr>
              </thead>
              <tbody>
                {teams.map((team, i) => (
                  <tr key={team}>
                    <td style={{ width: 40, color: 'var(--po-gray-400)' }}>{i + 1}</td>
                    <td className="col-name">{team}</td>
                    {editing && (
                      <td><button className="btn-row-delete" aria-label={`${team} 삭제`} onClick={() => removeTeam(team)}>&times;</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {teams.length === 0 && (
              <p className="list-empty">등록된 밍글 활동이 없습니다</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="customize-panel">
          <div className="customizer-section">
            <span className="customizer-label">사운드</span>
            <div className="customizer-options">
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
          </div>
          <BallCustomizer value={customization} onChange={setCustomization} />
        </div>
      )}

      <div className="mingle-scene">
        <BallScene
          ballSize={ballSize / 100}
          resetKey={resetKey}
          autoSpin={spinOn}
          freezeKey={freezeKey}
          smashAt={SMASH_REVEAL_AT}
          coreText={canSmash && sealed.length ? sealed.join(' · ') : undefined}
          shellColor={customization.shellColor}
          coreColor={customization.coreColor}
          background={customization.background}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={() => { play('smash'); handleSmash() }}
        />
        {!canSmash && (
          <div className="scene-blocker">
            <p>밍글 활동을 {PICK_COUNT}개 이상 추가하세요</p>
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
              <div className="confetti-text">이달의 밍글</div>
              <div className="winner-row">
                {result.map((name, i) => (
                  <div key={name} className="winner-rank">
                    <span className={`rank-badge ${i === 0 ? 'first' : 'second'}`}>{i + 1}등팀</span>
                    <h2 className="winner-name">{name}</h2>
                  </div>
                ))}
              </div>
              <div className="participant-list">
                <p className="participant-label">후보 활동</p>
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
        <Controls
          volume={volume}
          onVolumeChange={setVolume}
          muted={muted}
          onToggleMute={toggleMute}
          ballSize={ballSize}
          onBallSizeChange={setBallSize}
          onReset={handleRetry}
        />
        <PlayButtons
          frozen={frozen}
          spinOn={spinOn}
          onFreeze={() => { setFreezeKey(k => k + 1); setFrozen(true); setTimeout(() => setFrozen(false), 90_000) }}
          onToggleSpin={() => setSpinOn(v => !v)}
          onNewBall={handleRetry}
        />
      </div>

      <div className="mingle-history">
        <h3 className="history-title">지난 당첨 내역</h3>
        <div className="history-list">
          {PAST_DRAWS.map(draw => (
            <div key={draw.month} className="history-row">
              <span className="history-month">{draw.month}</span>
              <div className="history-winners">
                <span className="history-badge first">1등 {draw.first}</span>
                <span className="history-badge second">2등 {draw.second}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
