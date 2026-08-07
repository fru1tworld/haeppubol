import { BallColorPicker } from './BallColorPicker'
import { BACKGROUND_THEMES } from '../three/backgrounds'
import './BallCustomizer.css'

export interface BallCustomization {
  shellColor: string
  coreColor: string
  background: string
}

export const BallCustomizer = ({
  value,
  onChange,
}: {
  value: BallCustomization
  onChange: (v: BallCustomization) => void
}) => (
  <div className="ball-customizer">
    <BallColorPicker
      shellColor={value.shellColor}
      coreColor={value.coreColor}
      onShellChange={hex => onChange({ ...value, shellColor: hex })}
      onCoreChange={hex => onChange({ ...value, coreColor: hex })}
    />
    <div className="customizer-row">
      <span className="customizer-label">배경</span>
      <div className="customizer-options">
        {BACKGROUND_THEMES.map(t => (
          <button
            key={t.id}
            className={`customizer-chip bg-chip${value.background === t.id ? ' selected' : ''}`}
            onClick={() => onChange({ ...value, background: t.id })}
          >
            <span className="bg-chip-swatch" style={{ background: t.gradient }} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
    <div className="customizer-preview">
      <div
        className="customizer-preview-ball"
        style={{ background: `radial-gradient(circle at 35% 35%, ${value.shellColor}, ${value.coreColor} 80%)` }}
      />
    </div>
  </div>
)
