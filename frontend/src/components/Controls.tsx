import './Controls.css'

export const Controls = ({
  volume,
  onVolumeChange,
  ballSize,
  onBallSizeChange,
  onReset,
}: {
  volume: number
  onVolumeChange: (v: number) => void
  ballSize: number
  onBallSizeChange: (s: number) => void
  onReset: () => void
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
    <button className="controls-reset" onClick={onReset}>
      리셋
    </button>
  </>
)
