import type { SoundName } from './sounds'
import { soundSets } from './soundSets'
import type { SoundSetName } from './soundSets'

export interface AudioManager {
  play: (name: SoundName) => void
  setVolume: (volume: number) => void
  getVolume: () => number
  setSoundSet: (set: SoundSetName) => void
  getSoundSet: () => SoundSetName
}

export const createAudioManager = (): AudioManager => {
  let ctx: AudioContext | null = null
  let masterGain: GainNode | null = null
  let volume = 70
  let soundSet: SoundSetName = 'classic'

  const ensureContext = (): { ctx: AudioContext; masterGain: GainNode } => {
    if (!ctx) {
      ctx = new AudioContext()
      masterGain = ctx.createGain()
      masterGain.gain.value = volume / 100
      masterGain.connect(ctx.destination)
    }
    return { ctx, masterGain: masterGain! }
  }

  return {
    play(name: SoundName) {
      const { ctx: audioCtx, masterGain: gain } = ensureContext()
      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }
      const pitch = 0.95 + Math.random() * 0.1
      soundSets[soundSet][name](audioCtx, gain, pitch)
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
    },

    getSoundSet() {
      return soundSet
    },
  }
}
