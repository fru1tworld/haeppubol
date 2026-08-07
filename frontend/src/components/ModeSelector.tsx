import type { DiningMode } from '../types'
import './ModeSelector.css'

const MODES: readonly { key: DiningMode; label: string }[] = [
  { key: 'dine-in', label: '직접방문' },
  { key: 'delivery', label: '배달' },
]

export const ModeSelector = ({
  mode,
  onChange,
}: {
  mode: DiningMode
  onChange: (mode: DiningMode) => void
}) => (
  <div className="mode-selector">
    {MODES.map(m => (
      <button
        key={m.key}
        className={`mode-pill${mode === m.key ? ' active' : ''}`}
        onClick={() => onChange(m.key)}
      >
        {m.label}
      </button>
    ))}
  </div>
)
