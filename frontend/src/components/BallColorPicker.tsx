import { CORE_COLORS, SHELL_COLORS, type BallColorOption } from '../three/ballColors'
import './BallColorPicker.css'

const SwatchRow = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly BallColorOption[]
  value: string
  onChange: (hex: string) => void
}) => (
  <div className="color-picker-row">
    <span className="color-picker-label">{label}</span>
    <div className="color-picker-swatches">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          title={o.label}
          aria-label={`${label} ${o.label}`}
          aria-pressed={value.toLowerCase() === o.hex.toLowerCase()}
          className={`color-swatch${value.toLowerCase() === o.hex.toLowerCase() ? ' selected' : ''}`}
          style={{ background: o.hex }}
          onClick={() => onChange(o.hex)}
        />
      ))}
    </div>
  </div>
)

export const BallColorPicker = ({
  shellColor,
  coreColor,
  onShellChange,
  onCoreChange,
  className = '',
}: {
  shellColor: string
  coreColor: string
  onShellChange: (hex: string) => void
  onCoreChange: (hex: string) => void
  className?: string
}) => (
  <div className={`color-picker ${className}`.trim()}>
    <SwatchRow label="겉면" options={SHELL_COLORS} value={shellColor} onChange={onShellChange} />
    <SwatchRow label="속" options={CORE_COLORS} value={coreColor} onChange={onCoreChange} />
  </div>
)
