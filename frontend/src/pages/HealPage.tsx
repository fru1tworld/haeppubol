import { useEffect, useState } from 'react'
import { BallScene } from '../three/BallScene'
import { Controls, initialBallSize } from '../components/Controls'
import { useSound } from '../audio/useSound'
import { DEFAULT_HEAL_BALL, HEAL_BALLS } from '../constants/healBalls'
import { fileToDataUrl, safeSetItem } from '../utils/image'
import { useFreeze } from '../hooks/useFreeze'
import './HealPage.css'

const FACE_KEY = 'wakbbu-heal-faces'

/** 크루별로 올린 얼굴 사진(data URL) */
const loadFaces = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(FACE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const HealPage = () => {
  const [ballId, setBallId] = useState(DEFAULT_HEAL_BALL)
  const [faces, setFaces] = useState<Record<string, string>>(loadFaces)
  const [ballSize, setBallSize] = useState(initialBallSize)
  const [spinOn, setSpinOn] = useState(true)
  const [resetKey, setResetKey] = useState(0)
  const { frozen, freezeKey, freeze } = useFreeze()
  const { play, playCracks, setRubbing, setVolume, volume, muted, toggleMute, setSoundSet } = useSound()

  const ball = HEAL_BALLS.find(b => b.id === ballId) ?? HEAL_BALLS[0]

  // 올린 사진이 있으면 그걸, 없으면 크루 기본 사진을 붙인다
  const faceUrl = ball ? faces[ball.id] ?? ball.photo : undefined

  useEffect(() => {
    safeSetItem(FACE_KEY, JSON.stringify(faces))
  }, [faces])

  useEffect(() => {
    if (ball) setSoundSet(ball.sound)
  }, [ball, setSoundSet])

  const pickBall = (id: string) => {
    if (id === ballId) return
    setBallId(id)
    setResetKey(k => k + 1)
    play('toggle')
  }

  const handleFace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !ball) return
    fileToDataUrl(file)
      .then(url => {
        setFaces(prev => ({ ...prev, [ball.id]: url }))
        setResetKey(k => k + 1)
      })
      .catch(() => {})
  }

  const clearFace = () => {
    if (!ball) return
    setFaces(prev => {
      const next = { ...prev }
      delete next[ball.id]
      return next
    })
    setResetKey(k => k + 1)
  }

  const handleNew = () => {
    setResetKey(k => k + 1)
    play('reset')
  }

  if (!ball) {
    return (
      <div className="heal-page">
        <p className="heal-tagline">등록된 힐링볼이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="heal-page">
      <div className="heal-header">
        <div className="heal-tabs">
          {HEAL_BALLS.map(b => (
            <button
              key={b.id}
              className={b.id === ball.id ? 'active' : ''}
              onClick={() => pickBall(b.id)}
            >
              {b.name}
            </button>
          ))}
        </div>
        <div className="heal-face-actions">
          <label className="heal-face-chip">
            얼굴 사진 넣기
            <input type="file" accept="image/*" onChange={handleFace} hidden />
          </label>
          {faces[ball.id] && (
            <button className="heal-face-chip" onClick={clearFace}>기본 사진으로</button>
          )}
        </div>
      </div>

      <p className="heal-tagline">{ball.tagline}</p>

      <div className="heal-scene">
        <BallScene
          ballSize={ballSize / 100}
          autoSpin={spinOn}
          background={ball.background}
          shellColor={ball.shellColor}
          coreColor={ball.coreColor}
          faceUrl={faceUrl}
          resetKey={resetKey}
          freezeKey={freezeKey}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={() => play('smash')}
        />
        <p className="heal-hint">드래그해서 돌리고, 꾹 눌러서 뿌수세요</p>
      </div>

      <div className="heal-buttons">
        <button
          className={`heal-button${frozen ? ' on' : ''}`}
          onClick={freeze}
        >
          {frozen ? '-18°C 해동 중' : '냉동실에 넣기'}
        </button>
        <button
          className={`heal-button${spinOn ? ' on' : ''}`}
          onClick={() => setSpinOn(v => !v)}
        >
          자동 회전
        </button>
        <button className="heal-button" onClick={handleNew}>새 왁뿌볼</button>
      </div>

      <Controls
        volume={volume}
        onVolumeChange={setVolume}
        muted={muted}
        onToggleMute={toggleMute}
        ballSize={ballSize}
        onBallSizeChange={setBallSize}
        onReset={handleNew}
      />
    </div>
  )
}
