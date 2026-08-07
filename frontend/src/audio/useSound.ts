import { useRef, useCallback, useState } from 'react'
import { createAudioManager } from './AudioManager'
import type { SoundName } from './sounds'
import type { SoundSetName } from './soundSets'

export const useSound = () => {
  const managerRef = useRef<ReturnType<typeof createAudioManager> | null>(null)
  const [volume, setVolumeState] = useState(70)
  const [soundSet, setSoundSetState] = useState<SoundSetName>('classic')

  const getManager = () => {
    if (!managerRef.current) {
      managerRef.current = createAudioManager()
    }
    return managerRef.current
  }

  const play = useCallback((name: SoundName) => {
    getManager().play(name)
  }, [])

  const setVolume = useCallback((v: number) => {
    getManager().setVolume(v)
    setVolumeState(v)
  }, [])

  const setSoundSet = useCallback((set: SoundSetName) => {
    getManager().setSoundSet(set)
    setSoundSetState(set)
  }, [])

  return { play, setVolume, volume, soundSet, setSoundSet }
}
