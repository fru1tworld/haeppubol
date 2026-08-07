import type { SoundName, SoundPlayer } from './sounds'
import { sounds as classic } from './sounds'

export type SoundSetName = 'classic' | 'slime' | 'keycap' | 'water' | 'bubblewrap' | 'slinky' | 'squishy'

interface SoundSetMeta {
  name: SoundSetName
  label: string
  emoji: string
}

export const SOUND_SET_LIST: SoundSetMeta[] = [
  { name: 'classic', label: '왁뿌볼', emoji: '' },
  { name: 'slime', label: '슬라임', emoji: '' },
  { name: 'keycap', label: '키캡', emoji: '' },
  { name: 'water', label: '물소리', emoji: '' },
  { name: 'bubblewrap', label: '뽁뽁이', emoji: '' },
  { name: 'slinky', label: '슬랑이', emoji: '' },
  { name: 'squishy', label: '말랑이', emoji: '' },
]

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>()

const noiseSource = (ctx: AudioContext): AudioBufferSourceNode => {
  let buffer = noiseBuffers.get(ctx)
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseBuffers.set(ctx, buffer)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

const squish = (
  ctx: AudioContext, destination: AudioNode, when: number,
  duration: number, fromHz: number, toHz: number, level: number, pitch: number,
): void => {
  const noise = noiseSource(ctx)
  noise.playbackRate.value = pitch

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 3.5
  filter.frequency.setValueAtTime(fromHz * pitch, when)
  filter.frequency.exponentialRampToValueAtTime(toHz * pitch, when + duration)

  const lfo = ctx.createOscillator()
  lfo.frequency.value = 28
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = fromHz * 0.35
  lfo.connect(lfoGain).connect(filter.frequency)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(level, when + duration * 0.15)
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration)

  noise.connect(filter).connect(gain).connect(destination)
  noise.start(when)
  noise.stop(when + duration)
  lfo.start(when)
  lfo.stop(when + duration)
}

const blub = (
  ctx: AudioContext, destination: AudioNode, when: number,
  fromHz: number, toHz: number, duration: number, level: number,
): void => {
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(fromHz, when)
  osc.frequency.exponentialRampToValueAtTime(toHz, when + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(level, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration)
  osc.connect(gain).connect(destination)
  osc.start(when)
  osc.stop(when + duration)
}

const slimePop: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  squish(ctx, destination, now, 0.13, 900, 180, 0.5, pitch)
  blub(ctx, destination, now + 0.02, 260 * pitch, 90 * pitch, 0.1, 0.25)
}

const slimeSmash: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  squish(ctx, destination, now, 0.38, 1300, 120, 0.55, pitch)
  blub(ctx, destination, now + 0.08, 180 * pitch, 420 * pitch, 0.09, 0.2)
  blub(ctx, destination, now + 0.18, 220 * pitch, 520 * pitch, 0.08, 0.18)
  blub(ctx, destination, now + 0.27, 150 * pitch, 380 * pitch, 0.1, 0.15)
}

const slimeReveal: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  ;[200, 300, 430].forEach((freq, i) => {
    const start = now + i * 0.09
    squish(ctx, destination, start, 0.08, 700, 300, 0.25, pitch)
    blub(ctx, destination, start, freq * pitch, freq * 2.2 * pitch, 0.09, 0.22)
  })
}

const keystroke = (
  ctx: AudioContext, destination: AudioNode, when: number,
  tockHz: number, level: number,
): void => {
  const click = noiseSource(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 5000
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(level * 0.7, when)
  clickGain.gain.exponentialRampToValueAtTime(0.001, when + 0.005)
  click.connect(hp).connect(clickGain).connect(destination)
  click.start(when)
  click.stop(when + 0.005)

  const tock = noiseSource(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 6
  bp.frequency.setValueAtTime(tockHz, when)
  bp.frequency.exponentialRampToValueAtTime(tockHz * 0.75, when + 0.028)
  const tockGain = ctx.createGain()
  tockGain.gain.setValueAtTime(level, when + 0.002)
  tockGain.gain.exponentialRampToValueAtTime(0.001, when + 0.03)
  tock.connect(bp).connect(tockGain).connect(destination)
  tock.start(when)
  tock.stop(when + 0.03)

  const thud = ctx.createOscillator()
  thud.type = 'sine'
  thud.frequency.setValueAtTime(140, when)
  const thudGain = ctx.createGain()
  thudGain.gain.setValueAtTime(level * 0.18, when)
  thudGain.gain.exponentialRampToValueAtTime(0.001, when + 0.02)
  thud.connect(thudGain).connect(destination)
  thud.start(when)
  thud.stop(when + 0.02)
}

const keycapPop: SoundPlayer = (ctx, destination, pitch) => {
  keystroke(ctx, destination, ctx.currentTime, 750 * pitch, 0.45)
}

const keycapSmash: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  const tocks = [820, 680, 900, 620, 860, 740]
  tocks.forEach((hz, i) => {
    keystroke(ctx, destination, now + i * 0.045, hz * pitch, 0.35)
  })
  keystroke(ctx, destination, now + tocks.length * 0.045 + 0.03, 380 * pitch, 0.55)
}

const keycapReveal: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  ;[650, 780, 920, 1100].forEach((hz, i) => {
    keystroke(ctx, destination, now + i * 0.07, hz * pitch, 0.4)
  })
}

const droplet = (
  ctx: AudioContext, destination: AudioNode, when: number,
  baseHz: number, level: number,
): void => {
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(baseHz, when)
  osc.frequency.exponentialRampToValueAtTime(baseHz * 2.6, when + 0.09)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(level, when + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.11)
  osc.connect(gain).connect(destination)
  osc.start(when)
  osc.stop(when + 0.11)
}

const splash = (
  ctx: AudioContext, destination: AudioNode, when: number,
  duration: number, level: number, pitch: number,
): void => {
  const noise = noiseSource(ctx)
  noise.playbackRate.value = pitch
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 1
  lp.frequency.setValueAtTime(1600 * pitch, when)
  lp.frequency.exponentialRampToValueAtTime(220 * pitch, when + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(level, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration)
  noise.connect(lp).connect(gain).connect(destination)
  noise.start(when)
  noise.stop(when + duration)
}

const waterPop: SoundPlayer = (ctx, destination, pitch) => {
  droplet(ctx, destination, ctx.currentTime, 380 * pitch, 0.35)
}

const waterSmash: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  splash(ctx, destination, now, 0.32, 0.45, pitch)
  droplet(ctx, destination, now + 0.1, 340 * pitch, 0.22)
  droplet(ctx, destination, now + 0.19, 420 * pitch, 0.18)
  droplet(ctx, destination, now + 0.27, 290 * pitch, 0.15)
}

const waterReveal: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  ;[300, 400, 520].forEach((hz, i) => {
    droplet(ctx, destination, now + i * 0.09, hz * pitch, 0.3)
  })
}

const bubblePop = (
  ctx: AudioContext, destination: AudioNode, when: number,
  centerHz: number, level: number,
): void => {
  const noise = noiseSource(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.2
  bp.frequency.value = centerHz
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(level, when)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.025)
  noise.connect(bp).connect(noiseGain).connect(destination)
  noise.start(when)
  noise.stop(when + 0.025)

  const snap = ctx.createOscillator()
  snap.type = 'sine'
  snap.frequency.setValueAtTime(centerHz * 0.4, when)
  snap.frequency.exponentialRampToValueAtTime(centerHz * 0.12, when + 0.035)
  const snapGain = ctx.createGain()
  snapGain.gain.setValueAtTime(level * 0.7, when)
  snapGain.gain.exponentialRampToValueAtTime(0.001, when + 0.035)
  snap.connect(snapGain).connect(destination)
  snap.start(when)
  snap.stop(when + 0.035)
}

const wrapPop: SoundPlayer = (ctx, destination, pitch) => {
  bubblePop(ctx, destination, ctx.currentTime, 1800 * pitch, 0.45)
}

const wrapSmash: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  for (let i = 0; i < 9; i++) {
    const jitter = 0.7 + ((i * 37) % 10) / 10 * 0.8
    bubblePop(ctx, destination, now + i * 0.032, 1500 * pitch * jitter, 0.3)
  }
}

const wrapReveal: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  ;[1200, 1700, 2300].forEach((hz, i) => {
    bubblePop(ctx, destination, now + i * 0.08, hz * pitch, 0.4)
  })
}

const boing = (
  ctx: AudioContext, destination: AudioNode, when: number,
  baseHz: number, duration: number, level: number,
): void => {
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(baseHz, when)
  osc.frequency.exponentialRampToValueAtTime(baseHz * 0.5, when + duration)

  const wobble = ctx.createOscillator()
  wobble.frequency.setValueAtTime(26, when)
  wobble.frequency.exponentialRampToValueAtTime(7, when + duration)
  const wobbleGain = ctx.createGain()
  wobbleGain.gain.setValueAtTime(baseHz * 0.5, when)
  wobbleGain.gain.exponentialRampToValueAtTime(baseHz * 0.04, when + duration)
  wobble.connect(wobbleGain).connect(osc.frequency)

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 4
  lp.frequency.setValueAtTime(baseHz * 7, when)
  lp.frequency.exponentialRampToValueAtTime(baseHz * 2, when + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(level, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration)

  osc.connect(lp).connect(gain).connect(destination)
  osc.start(when)
  osc.stop(when + duration)
  wobble.start(when)
  wobble.stop(when + duration)
}

const slinkyPop: SoundPlayer = (ctx, destination, pitch) => {
  boing(ctx, destination, ctx.currentTime, 340 * pitch, 0.16, 0.35)
}

const slinkySmash: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  boing(ctx, destination, now, 260 * pitch, 0.42, 0.45)
  boing(ctx, destination, now + 0.16, 380 * pitch, 0.2, 0.25)
  boing(ctx, destination, now + 0.3, 300 * pitch, 0.16, 0.18)
}

const slinkyReveal: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  ;[240, 330, 450].forEach((hz, i) => {
    boing(ctx, destination, now + i * 0.1, hz * pitch, 0.18, 0.3)
  })
}

const squeeze = (
  ctx: AudioContext, destination: AudioNode, when: number,
  duration: number, level: number, pitch: number,
): void => {
  const noise = noiseSource(ctx)
  noise.playbackRate.value = pitch * 0.7

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 0.8
  lp.frequency.setValueAtTime(650 * pitch, when)
  lp.frequency.exponentialRampToValueAtTime(160 * pitch, when + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(level, when + duration * 0.35)
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration)

  noise.connect(lp).connect(gain).connect(destination)
  noise.start(when)
  noise.stop(when + duration)

  const body = ctx.createOscillator()
  body.type = 'sine'
  body.frequency.setValueAtTime(150 * pitch, when)
  body.frequency.exponentialRampToValueAtTime(85 * pitch, when + duration)
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(0.0001, when)
  bodyGain.gain.exponentialRampToValueAtTime(level * 0.6, when + duration * 0.3)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, when + duration)
  body.connect(bodyGain).connect(destination)
  body.start(when)
  body.stop(when + duration)
}

const squishyPop: SoundPlayer = (ctx, destination, pitch) => {
  squeeze(ctx, destination, ctx.currentTime, 0.16, 0.4, pitch)
}

const squishySmash: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  squeeze(ctx, destination, now, 0.45, 0.5, pitch)
  squeeze(ctx, destination, now + 0.3, 0.22, 0.25, pitch * 1.4)
}

const squishyReveal: SoundPlayer = (ctx, destination, pitch) => {
  const now = ctx.currentTime
  ;[1, 1.25, 1.6].forEach((mul, i) => {
    squeeze(ctx, destination, now + i * 0.12, 0.15, 0.3, pitch * mul)
  })
}

export const soundSets: Record<SoundSetName, Record<SoundName, SoundPlayer>> = {
  classic,
  slime: { ...classic, pop: slimePop, smash: slimeSmash, reveal: slimeReveal },
  keycap: { ...classic, pop: keycapPop, smash: keycapSmash, reveal: keycapReveal },
  water: { ...classic, pop: waterPop, smash: waterSmash, reveal: waterReveal },
  bubblewrap: { ...classic, pop: wrapPop, smash: wrapSmash, reveal: wrapReveal },
  slinky: { ...classic, pop: slinkyPop, smash: slinkySmash, reveal: slinkyReveal },
  squishy: { ...classic, pop: squishyPop, smash: squishySmash, reveal: squishyReveal },
}
