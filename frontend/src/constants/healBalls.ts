import type { SoundSetName } from '../audio/soundSets'

export interface HealBall {
  readonly id: string
  readonly name: string
  readonly tagline: string
  readonly shellColor: string
  readonly coreColor: string
  readonly background: string
  readonly sound: SoundSetName
  readonly photo: string
}

export const HEAL_BALLS: readonly HealBall[] = [] as const

export const DEFAULT_HEAL_BALL: string | undefined = HEAL_BALLS[0]?.id
