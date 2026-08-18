import type { SoundName } from './sounds'
import { soundSets } from './soundSets'
import type { SoundSetName } from './soundSets'
import type { CrackEvent, Rng } from '../three/waxTypes'
import { createRubLoop, playCrackCluster, preloadSamples } from './crackSounds'
import type { CrackCondition, RubLoop } from './crackSounds'


interface AudioManager {
  play: (name: SoundName) => void
  playCracks: (events: CrackEvent[], cond: CrackCondition) => void
  setRubbing: (force: number) => void
  setVolume: (volume: number) => void
  getVolume: () => number
  setMuted: (muted: boolean) => void
  isMuted: () => boolean
  setSoundSet: (set: SoundSetName) => void
  getSoundSet: () => SoundSetName
}

export const createAudioManager = (rng: Rng): AudioManager => {
  let ctx: AudioContext | null = null
  let masterGain: GainNode | null = null
  let rubLoop: RubLoop | null = null
  let volume = 70
  let muted = false
  let soundSet: SoundSetName = 'slime'

  const ensureContext = (): { ctx: AudioContext; masterGain: GainNode } => {
    if (!ctx) {
      ctx = new AudioContext()
      masterGain = ctx.createGain()
      masterGain.gain.value = volume / 100
      masterGain.connect(ctx.destination)
      rubLoop = createRubLoop(ctx, masterGain, rng)
      preloadSamples(ctx, soundSet)
    }
    return { ctx, masterGain: masterGain! }
  }

  return {
    play(name: SoundName) {
      if (muted) return
      const { ctx: audioCtx, masterGain: gain } = ensureContext()
      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }
      const pitch = 0.95 + rng() * 0.1
      soundSets[soundSet][name](audioCtx, gain, pitch)
    },

    playCracks(events: CrackEvent[], cond: CrackCondition) {
      if (muted) return
      const { ctx: audioCtx, masterGain: gain } = ensureContext()
      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }
      playCrackCluster(audioCtx, gain, events, cond, rng, soundSet)
    },

    setRubbing(force: number) {
      if (!rubLoop) return
      rubLoop.setRubbing(muted ? 0 : force)
    },

    setMuted(m: boolean) {
      muted = m
      if (rubLoop) rubLoop.setRubbing(0)
    },

    isMuted() {
      return muted
    },

    setVolume(v: number) {
      volume = Math.max(0, Math.min(100, v))
      if (masterGain) {
        masterGain.gain.value = volume / 100
      }
    },

    getVolume() {
      return volume
    },

    setSoundSet(set: SoundSetName) {
      soundSet = set
      const { ctx: audioCtx } = ensureContext()
      preloadSamples(audioCtx, set)
    },

    getSoundSet() {
      return soundSet
    },
  }
}
