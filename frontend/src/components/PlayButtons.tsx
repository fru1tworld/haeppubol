import './PlayButtons.css'

export const PlayButtons = ({
  frozen,
  spinOn,
  onFreeze,
  onToggleSpin,
  onNewBall,
}: {
  frozen: boolean
  spinOn: boolean
  onFreeze: () => void
  onToggleSpin: () => void
  onNewBall: () => void
}) => (
  <div className="play-buttons">
    <button className={`play-button${frozen ? ' on' : ''}`} onClick={onFreeze}>
      {frozen ? '-18°C 해동 중' : '냉동실에 넣기'}
    </button>
    <button className={`play-button${spinOn ? ' on' : ''}`} onClick={onToggleSpin}>
      자동 회전
    </button>
    <button className="play-button" onClick={onNewBall}>새 왁뿌볼</button>
  </div>
)
