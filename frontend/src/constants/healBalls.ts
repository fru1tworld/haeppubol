import type { SoundSetName } from '../audio/soundSets'
import { CORE_COLORS, SHELL_COLORS } from '../three/ballColors'

// 힐링 왁뿌볼 — 추첨 없이 그냥 뿌수는 체험. 크루 얼굴을 붙인 프리셋.

export interface HealBall {
  readonly id: string
  readonly name: string
  readonly tagline: string
  readonly shellColor: string
  readonly coreColor: string
  readonly background: string
  readonly sound: SoundSetName
  /** 공에 붙는 기본 얼굴 사진 */
  readonly photo: string
}

const shell = (id: string) => SHELL_COLORS.find(c => c.id === id)!.hex
const core = (id: string) => CORE_COLORS.find(c => c.id === id)!.hex

export const HEAL_BALLS: readonly HealBall[] = [
  {
    id: 'brain',
    name: 'Brain 왁뿌볼',
    tagline: '고민이 많은 날, 브레인을 조물조물',
    shellColor: shell('cream'),
    coreColor: core('strawberry'),
    background: 'peach',
    sound: 'classic',
    photo: '/brian_wakbbu.png',
  },
  {
    id: 'dan',
    name: 'Dan 왁뿌볼',
    tagline: '배포 실패한 날, 댄을 뿌시며 힐링',
    shellColor: shell('sky'),
    coreColor: core('ocean'),
    background: 'charcoal',
    sound: 'classic',
    photo: '/dan_wakbbu.png',
  },
] as const

export const DEFAULT_HEAL_BALL = HEAL_BALLS[0].id
