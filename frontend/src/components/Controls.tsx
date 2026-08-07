import './Controls.css'

export const Controls = ({
  volume,
  onVolumeChange,
  ballSize,
  onBallSizeChange,
  onReset,
  onFreeze,
  frozen,
  onToggleSpin,
  spinOn,
  onNew,
}: {
  volume: number
  onVolumeChange: (v: number) => void
  ballSize: number
  onBallSizeChange: (s: number) => void
  onReset: () => void
  onFreeze?: () => void
  frozen?: boolean
  onToggleSpin?: () => void
  spinOn?: boolean
  onNew?: () => void
}) => (
  <>
    <div className="controls-left">
      <span className="controls-label">음량</span>
      <input
        type="range"
        className="controls-slider vertical"
        min={0}
        max={100}
        value={volume}
        onChange={e => onVolumeChange(Number(e.target.value))}
      />
      <span className="controls-label">크기</span>
      <input
        type="range"
        className="controls-slider vertical"
        min={33}
        max={170}
        value={ballSize}
        onChange={e => onBallSizeChange(Number(e.target.value))}
      />
    </div>
    {(onFreeze || onToggleSpin || onNew) && (
      <div className="controls-bottom">
        {onFreeze && (
          <button
            className={`controls-button${frozen ? ' on' : ''}`}
            onClick={onFreeze}
          >
            {frozen ? '-18°C 해동 중' : '냉동실에 넣기'}
          </button>
        )}
        {onToggleSpin && (
          <button
            className={`controls-button${spinOn ? ' on' : ''}`}
            onClick={onToggleSpin}
          >
            자동 회전
          </button>
        )}
        {onNew && (
          <button className="controls-button" onClick={onNew}>
            새 왁뿌볼
          </button>
        )}
      </div>
    )}
    <button className="controls-reset" onClick={onReset}>
      리셋
    </button>
  </>
)
