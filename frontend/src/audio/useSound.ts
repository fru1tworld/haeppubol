import { useRef, useCallback, useState } from 'react'
import { createAudioManager } from './AudioManager'
import type { SoundName } from './sounds'
import type { SoundSetName } from './soundSets'
import type { CrackEvent } from '../three/waxTypes'
import type { CrackCondition } from './crackSounds'

export const useSound = () => {
  const managerRef = useRef<ReturnType<typeof createAudioManager> | null>(null)
  const [volume, setVolumeState] = useState(70)
  const [muted, setMutedState] = useState(false)
  const [soundSet, setSoundSetState] = useState<SoundSetName>('slime')

  const getManager = () => {
    if (!managerRef.current) {
      managerRef.current = createAudioManager(Math.random)
    }
    return managerRef.current
  }

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
