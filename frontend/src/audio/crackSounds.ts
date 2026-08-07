import type { CrackEvent, Rng } from '../three/waxTypes'

// 왁스 파괴 트랜지언트와 문지름(rub) 루프. 레퍼런스 wakbboolball-3d.html 598~643, 804~807행.

/** 사운드 파라미터에 필요한 물성 조건 */
export interface CrackCondition {
  integrity: number
  /** 0 = -18°C, 1 = 22°C */
  temp: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>()

const noiseBuffer = (ctx: AudioContext, rng: Rng): AudioBuffer => {
  let buffer = noiseBuffers.get(ctx)
  if (!buffer) {
    const len = ctx.sampleRate * 1.0
    buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = rng() * 2 - 1
    noiseBuffers.set(ctx, buffer)
  }
  return buffer
}

/** 파괴 트랜지언트 1개. CrackEvent 1개당 1회, 루프 없음 */
export const playCrack = (
  ctx: AudioContext,
  destination: AudioNode,
  event: CrackEvent,
  cond: CrackCondition,
  rng: Rng,
): void => {
  const { size, delayMs } = event
  const t = ctx.currentTime + delayMs / 1000
  const cold = 1 - cond.temp
  const wear = 1 - cond.integrity
  const dur = (0.014 + size * 0.072) * (1 - cold * 0.2)

  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, rng)
  src.loop = true
  src.playbackRate.value = 0.8 + rng() * 0.5

  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  const f0 = (4600 - size * 3250) * (1 + cold * 0.34) * (1 + wear * 0.42)
  bp.frequency.setValueAtTime(clamp(f0 * 1.25, 200, 15000), t)
  bp.frequency.exponentialRampToValueAtTime(clamp(f0 * 0.62, 200, 15000), t + dur)
  bp.Q.value = 1.0 + size * 3.4

  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 240

  const vol = (0.16 + size * 0.5) * (0.35 + 0.65 * cond.integrity) * (1 + cold * 0.22)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.0012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)

  src.connect(bp)
  bp.connect(hp)
  hp.connect(g)
  g.connect(destination)
  src.start(t)
  src.stop(t + dur + 0.03)

  // 큰 조각은 몸통 울림(triangle 바디 톤) 추가
  if (size > 0.45) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(150 + size * 90, t)
    o.frequency.exponentialRampToValueAtTime(58, t + 0.075)
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.0001, t)
    og.gain.linearRampToValueAtTime(0.1 * size * (0.4 + 0.6 * cond.integrity), t + 0.003)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    o.connect(og)
    og.connect(destination)
    o.start(t)
    o.stop(t + 0.11)
  }
}

/** 한 압착의 이벤트들을 delayMs대로 흩어 재생(빠자작) */
export const playCrackCluster = (
  ctx: AudioContext,
  destination: AudioNode,
  events: CrackEvent[],
  cond: CrackCondition,
  rng: Rng,
): void => {
  for (const event of events) {
    playCrack(ctx, destination, event, cond, rng)
  }
}

/** 문지름 노이즈 루프. gain 0으로 상시 재생, setRubbing으로 열고 닫는다 */
export interface RubLoop {
  setRubbing: (force: number) => void
}

export const createRubLoop = (ctx: AudioContext, destination: AudioNode, rng: Rng): RubLoop => {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, rng)
  src.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 260
  const gain = ctx.createGain()
  gain.gain.value = 0
  src.connect(lp)
  lp.connect(gain)
  gain.connect(destination)
  src.start()

  return {
    setRubbing(force: number) {
      gain.gain.setTargetAtTime(0.03 * Math.min(force, 1.2), ctx.currentTime, 0.06)
      lp.frequency.setTargetAtTime(180 + force * 230, ctx.currentTime, 0.06)
    },
  }
}
