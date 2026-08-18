import { useCallback, useState } from 'react'
import { createAudioManager } from './AudioManager'
import type { SoundName } from './sounds'
import type { SoundSetName } from './soundSets'
import type { CrackEvent } from '../three/waxTypes'
import type { CrackCondition } from './crackSounds'

// 페이지마다 AudioContext를 만들면 이동할수록 컨텍스트가 쌓여 브라우저 상한에
// 걸리고, 음량·음소거 설정도 페이지마다 초기화된다 — 앱 전체가 하나를 공유한다.
let sharedManager: ReturnType<typeof createAudioManager> | null = null
const getManager = () => (sharedManager ??= createAudioManager(Math.random))

export const useSound = () => {
  const [volume, setVolumeState] = useState(() => getManager().getVolume())
  const [muted, setMutedState] = useState(() => getManager().isMuted())
  const [soundSet, setSoundSetState] = useState<SoundSetName>(() => getManager().getSoundSet())

  const play = useCallback((name: SoundName) => {
    getManager().play(name)
  }, [])

  const playCracks = useCallback((events: CrackEvent[], cond: CrackCondition) => {
    getManager().playCracks(events, cond)
  }, [])

  const setRubbing = useCallback((force: number) => {
    getManager().setRubbing(force)
  }, [])

  const setVolume = useCallback((v: number) => {
    getManager().setVolume(v)
    setVolumeState(v)
  }, [])

  const setSoundSet = useCallback((set: SoundSetName) => {
    getManager().setSoundSet(set)
    setSoundSetState(set)
  }, [])

  const setMuted = useCallback((m: boolean) => {
    getManager().setMuted(m)
    setMutedState(m)
  }, [])

  const toggleMute = useCallback(() => {
    const next = !getManager().isMuted()
    getManager().setMuted(next)
    setMutedState(next)
  }, [])

  return { play, playCracks, setRubbing, setVolume, volume, muted, setMuted, toggleMute, soundSet, setSoundSet }
}
