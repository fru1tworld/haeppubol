import { useEffect, useRef } from 'react'
import type { PhysicsSnapshot } from '../three/waxTypes'
import './PhysicsPanel.css'

const HISTORY_LEN = 150
const FORCE_SCALE = 1.5
const PLASTIC_SCALE = 2.5

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export interface ForceSample {
  force: number
  cracked: boolean
}

const Bar = ({ ratio, barClass }: { ratio: number; barClass: string }) => (
  <div className={`physics-panel-bar ${barClass}`}>
    <i style={{ width: `${clamp01(ratio) * 100}%` }} />
  </div>
)

export const PhysicsPanel = ({
  snapshot,
  history,
  visible,
}: {
  snapshot: PhysicsSnapshot
  history: ForceSample[]
  visible: boolean
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { threshold } = snapshot

  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const w = rect.width
    const h = rect.height

    ctx.fillStyle = '#0d0b13'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = 'rgba(255,110,110,0.35)'
    ctx.setLineDash([3, 3])
    ctx.lineWidth = 1
    const ty = h - clamp01(threshold / FORCE_SCALE) * h
    ctx.beginPath()
    ctx.moveTo(0, ty)
    ctx.lineTo(w, ty)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = 'rgba(255,90,110,0.55)'
    history.forEach((p, i) => {
      if (!p.cracked) return
      const x = (i / HISTORY_LEN) * w
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    })

    ctx.strokeStyle = '#ffcf6e'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    history.forEach((p, i) => {
      const x = (i / HISTORY_LEN) * w
      const y = h - clamp01(p.force / FORCE_SCALE) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [visible, history, threshold])

  if (!visible) return null

  const tempC = Math.round(-18 + 40 * snapshot.temp)

  return (
    <div className="physics-panel">
      <h3>물성 패널</h3>
      <div className="physics-panel-row">
        <span>wax_integrity</span>
        <span>{snapshot.integrity.toFixed(2)}</span>
      </div>
      <Bar ratio={snapshot.integrity} barClass="wax" />
      <div className="physics-panel-row">
        <span>force / threshold</span>
        <span>
          {snapshot.force.toFixed(2)} / {snapshot.threshold.toFixed(2)}
        </span>
      </div>
      <Bar ratio={snapshot.force / FORCE_SCALE} barClass="force" />
      <div className="physics-panel-row">
        <span>plastic_strain</span>
        <span>{snapshot.plasticTotal.toFixed(2)}</span>
      </div>
      <Bar ratio={snapshot.plasticTotal / PLASTIC_SCALE} barClass="plastic" />
      <div className="physics-panel-row">
        <span>temperature</span>
        <span>{tempC}°C</span>
      </div>
      <Bar ratio={snapshot.temp} barClass="temp" />
      <div className="physics-panel-row">
        <span>cracks</span>
        <span>{snapshot.cracks}</span>
      </div>
      <div className="physics-panel-row">
        <span>shards left</span>
        <span>{snapshot.shardsLeft}</span>
      </div>
      <canvas ref={canvasRef} className="physics-panel-graph" />
      <div className="physics-panel-cap">힘 곡선 — 세로선 = 크랙(저항 급락)</div>
    </div>
  )
}
