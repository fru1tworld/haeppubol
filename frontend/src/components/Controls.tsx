import './Controls.css'

/** 크기 슬라이더 범위 (%) */
export const MIN_BALL_SIZE = 33
export const MAX_BALL_SIZE = 170

export const Controls = ({
  volume,
  onVolumeChange,
  muted = false,
  onToggleMute,
  ballSize,
  onBallSizeChange,
  onReset,
  faceOpacity,
  onFaceOpacityChange,
}: {
  volume: number
  onVolumeChange: (v: number) => void
  muted?: boolean
  onToggleMute?: () => void
  ballSize: number
  onBallSizeChange: (s: number) => void
  onReset: () => void
  /** 사진을 붙인 볼에서만 준다 — 사진이 말랑이에 얹히는 진하기 */
  faceOpacity?: number
  onFaceOpacityChange?: (v: number) => void
}) => (
  <>
    <div className="controls-left">
      <button
        className={`controls-mute${muted ? ' muted' : ''}`}
        onClick={onToggleMute}
        title={muted ? '소리 켜기' : '소리 끄기'}
      >
        {muted ? '음소거' : '음량'}
      </button>
      <input
        type="range"
        className="controls-slider vertical"
        min={0}
        max={100}
        value={muted ? 0 : volume}
        onChange={e => onVolumeChange(Number(e.target.value))}
        disabled={muted}
      />
      <span className="controls-label">크기</span>
      <input
        type="range"
        className="controls-slider vertical"
        min={MIN_BALL_SIZE}
        max={MAX_BALL_SIZE}
        value={ballSize}
        onChange={e => onBallSizeChange(Number(e.target.value))}
      />
      {faceOpacity !== undefined && onFaceOpacityChange && (
        <>
          <span className="controls-label">사진</span>
          <input
            type="range"
            className="controls-slider vertical"
            min={10}
            max={100}
            value={Math.round(faceOpacity * 100)}
            onChange={e => onFaceOpacityChange(Number(e.target.value) / 100)}
          />
        </>
      )}
    </div>
    <button className="controls-reset" onClick={onReset}>
      리셋
    </button>
  </>
)
