import type { CrackEvent, Rng } from '../three/waxTypes'
import type { SoundSetName } from './soundSets'

export interface CrackCondition {
  integrity: number
  /** 0 = -18°C, 1 = 22°C */
  temp: number
}

const SAMPLES_PER_SET = 4

const SAMPLE_PATHS: Record<SoundSetName, string[]> = {
  classic: Array.from({ length: SAMPLES_PER_SET }, (_, i) => `/sounds/classic_${i + 1}.ogg`),
  slime: Array.from({ length: SAMPLES_PER_SET }, (_, i) => `/sounds/slime_${i + 1}.ogg`),
  keycap: Array.from({ length: SAMPLES_PER_SET }, (_, i) => `/sounds/keycap_${i + 1}.wav`),
  water: Array.from({ length: SAMPLES_PER_SET }, (_, i) => `/sounds/water_${i + 1}.ogg`),
  bubblewrap: Array.from({ length: SAMPLES_PER_SET }, (_, i) => `/sounds/bubblewrap_${i + 1}.wav`),
  squishy: Array.from({ length: SAMPLES_PER_SET }, (_, i) => `/sounds/squishy_${i + 1}.ogg`),
}

interface PitchTuning {
  rateLo: number
  rateRange: number
  sizeInfluence: number
}

const PITCH_TUNING: Record<SoundSetName, PitchTuning> = {
  classic:    { rateLo: 0.8, rateRange: 0.5, sizeInfluence: 0.3 },
  slime:      { rateLo: 0.6, rateRange: 0.4, sizeInfluence: 0.2 },
  keycap:     { rateLo: 0.9, rateRange: 0.3, sizeInfluence: 0.15 },
  water:      { rateLo: 0.7, rateRange: 0.6, sizeInfluence: 0.25 },
  bubblewrap: { rateLo: 0.85, rateRange: 0.4, sizeInfluence: 0.1 },
  squishy:    { rateLo: 0.5, rateRange: 0.4, sizeInfluence: 0.2 },
}

const sampleCache = new Map<string, AudioBuffer[]>()
const loadingKeys = new Set<string>()

export const preloadSamples = async (ctx: AudioContext, set: SoundSetName): Promise<void> => {
  const key = set
  if (sampleCache.has(key) || loadingKeys.has(key)) return
  loadingKeys.add(key)
  try {
    const paths = SAMPLE_PATHS[set]
    const buffers = await Promise.all(
      paths.map(async (path) => {
        const res = await fetch(path)
        const ab = await res.arrayBuffer()
        return ctx.decodeAudioData(ab)
      }),
    )
    sampleCache.set(key, buffers)
  } finally {
    loadingKeys.delete(key)
  }
}

export const playCrack = (
  ctx: AudioContext,
  destination: AudioNode,
  event: CrackEvent,
  cond: CrackCondition,
  rng: Rng,
  set: SoundSetName = 'slime',
): void => {
  const samples = sampleCache.get(set)
  if (!samples?.length) return

  const { size, delayMs } = event
  const t = ctx.currentTime + delayMs / 1000
  const tune = PITCH_TUNING[set]

  const idx = Math.floor(rng() * samples.length)
  const src = ctx.createBufferSource()
  src.buffer = samples[idx]

  src.playbackRate.value =
    tune.rateLo + rng() * tune.rateRange + (1 - size) * tune.sizeInfluence

  const vol = (0.15 + size * 0.5) * (0.35 + 0.65 * cond.integrity)
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)

  src.connect(g)
  g.connect(destination)
  src.start(t)
}

export const playCrackCluster = (
  ctx: AudioContext,
  destination: AudioNode,
  events: CrackEvent[],
  cond: CrackCondition,
  rng: Rng,
  set: SoundSetName = 'slime',
): void => {
  for (const event of events) {
    playCrack(ctx, destination, event, cond, rng, set)
  }
}

export interface RubLoop {
  setRubbing: (force: number) => void
}

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
