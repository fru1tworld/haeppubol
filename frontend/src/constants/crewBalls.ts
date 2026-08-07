import type { SoundSetName } from '../audio/soundSets'

interface CrewBall {
  readonly id: string
  readonly name: string
  readonly author: string
  readonly items: readonly string[]
  readonly createdAt: string
  readonly shellColor?: string
  readonly coreColor?: string
  readonly tagline?: string
  readonly photo?: string
  readonly background?: string
  readonly sound?: SoundSetName
  readonly healMode?: boolean
}

export const CREW_BALLS: readonly CrewBall[] = [
  {
    id: 'crew-lunch-ladder',
    name: '성수 점심 사다리',
    author: 'mae',
    items: ['지우관', '효자동', '오토김밥', '우콘커리', '이북집'],
    createdAt: '2026-08-03T03:00:00.000Z',
    shellColor: '#fbdcc2',
    coreColor: '#e0405c',
    sound: 'slime',
  },
  {
    id: 'crew-mingle-group',
    name: '밍글 점심조 추첨',
    author: 'mae',
    items: ['1조', '2조', '3조', '4조', '5조'],
    createdAt: '2026-08-06T05:00:00.000Z',
    shellColor: '#ddcef3',
    coreColor: '#7c4dbd',
    sound: 'bubblewrap',
  },
]
