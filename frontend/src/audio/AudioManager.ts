import type { SoundName } from './sounds'
import { soundSets } from './soundSets'
import type { SoundSetName } from './soundSets'
import type { CrackEvent, Rng } from '../three/waxTypes'
import { createRubLoop, playCrackCluster } from './crackSounds'
import type { CrackCondition, RubLoop } from './crackSounds'

export interface AudioManager {
  play: (name: SoundName) => void
  /** 한 압착의 파괴 이벤트들을 delayMs대로 흩어 재생 */
  playCracks: (events: CrackEvent[], cond: CrackCondition) => void
  /** 문지름 루프 게인/컷오프. 컨텍스트가 아직 없으면 무시(레퍼런스와 동일) */
  setRubbing: (force: number) => void
  setVolume: (volume: number) => void
  getVolume: () => number
  setSoundSet: (set: SoundSetName) => void
  getSoundSet: () => SoundSetName
}

export const createAudioManager = (rng: Rng): AudioManager => {
  let ctx: AudioContext | null = null
  let masterGain: GainNode | null = null
  let rubLoop: RubLoop | null = null
  let volume = 70
  let soundSet: SoundSetName = 'classic'

  const ensureContext = (): { ctx: AudioContext; masterGain: GainNode } => {
    if (!ctx) {
      ctx = new AudioContext()
      masterGain = ctx.createGain()
      masterGain.gain.value = volume / 100
      masterGain.connect(ctx.destination)
      rubLoop = createRubLoop(ctx, masterGain, rng)
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

    playCracks(events: CrackEvent[], cond: CrackCondition) {
      const { ctx: audioCtx, masterGain: gain } = ensureContext()
      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }
      playCrackCluster(audioCtx, gain, events, cond, rng)
    },

    setRubbing(force: number) {
      if (!rubLoop) return
      rubLoop.setRubbing(force)
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
