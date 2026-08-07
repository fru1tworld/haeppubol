import { useCallback, useRef, useState } from 'react'
import { BallScene } from '../three/BallScene'
import type { ForceSample } from '../three/WaxBall'
import { Controls } from '../components/Controls'
import { PhysicsPanel } from '../components/PhysicsPanel'
import { useSound } from '../audio/useSound'
import type { PhysicsSnapshot } from '../three/waxTypes'
import './SmashPage.css'

const FREEZE_MS = 90_000
const HISTORY_LEN = 150
const PANEL_UPDATE_MS = 100

const INITIAL_SNAPSHOT: PhysicsSnapshot = {
  integrity: 1,
  force: 0,
  threshold: 1,
  plasticTotal: 0,
  temp: 1,
  cracks: 0,
  shardsLeft: 0,
}

export const SmashPage = () => {
  const [ballSize, setBallSize] = useState(100)
  const [spinOn, setSpinOn] = useState(true)
  const [panelOn, setPanelOn] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [freezeKey, setFreezeKey] = useState(0)
  const [snapshot, setSnapshot] = useState<PhysicsSnapshot>(INITIAL_SNAPSHOT)
  const [history, setHistory] = useState<ForceSample[]>([])
  const { play, playCracks, setRubbing, setVolume, volume } = useSound()

  const historyRef = useRef<ForceSample[]>([])
  const lastPanelUpdateRef = useRef(0)
  const panelOnRef = useRef(panelOn)
  panelOnRef.current = panelOn

  const handleSnapshot = useCallback((snap: PhysicsSnapshot, sample: ForceSample) => {
    const h = historyRef.current
    h.push(sample)
    if (h.length > HISTORY_LEN) h.shift()
    if (!panelOnRef.current) return
    const now = performance.now()
    if (now - lastPanelUpdateRef.current < PANEL_UPDATE_MS) return
    lastPanelUpdateRef.current = now
    setSnapshot(snap)
    setHistory([...h])
  }, [])

  const handleFreeze = () => {
    setFreezeKey(k => k + 1)
    setFrozen(true)
    setTimeout(() => setFrozen(false), FREEZE_MS)
  }

  const handleNew = () => {
    historyRef.current = []
    setHistory([])
    setSnapshot(INITIAL_SNAPSHOT)
    setResetKey(k => k + 1)
    play('reset')
  }

  return (
    <div className="smash-page">
      <div className="smash-scene">
        <BallScene
          ballSize={ballSize / 100}
          autoSpin={spinOn}
          resetKey={resetKey}
          freezeKey={freezeKey}
          onCracks={playCracks}
          onRubbing={setRubbing}
          onSmash={() => play('smash')}
          onSnapshot={handleSnapshot}
        />
        <PhysicsPanel snapshot={snapshot} history={history} visible={panelOn} />
      </div>

      <Controls
        volume={volume}
        onVolumeChange={setVolume}
        ballSize={ballSize}
        onBallSizeChange={setBallSize}
        onReset={handleNew}
        onFreeze={handleFreeze}
        frozen={frozen}
        onToggleSpin={() => setSpinOn(v => !v)}
        spinOn={spinOn}
        onTogglePanel={() => setPanelOn(v => !v)}
        panelOn={panelOn}
        onNew={handleNew}
      />
    </div>
  )
}
