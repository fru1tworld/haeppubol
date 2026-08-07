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
  {
    id: 'crew-standup-order',
    name: '스탠드업 발표 순서',
    author: 'fritz',
    items: ['Fritz', 'Mae', 'Sarah'],
    createdAt: '2026-08-07T00:30:00.000Z',
    shellColor: '#8f8a97',
    coreColor: '#f0993a',
  },
  {
    id: 'heal-brian',
    name: '브라이언 왁뿌볼',
    author: 'sarah',
    items: [],
    createdAt: '2026-08-07T01:00:00.000Z',
    shellColor: '#fbf8f1',
    coreColor: '#e0405c',
    tagline: '고민이 많은 날, 브라이언을 조물조물',
    photo: '/brian_wakbbu.png',
    background: 'peach',
    sound: 'squishy',
    healMode: true,
  },
  {
    id: 'heal-fritz',
    name: '프리츠 왁뿌볼',
    author: 'fritz',
    items: [],
    createdAt: '2026-08-07T02:00:00.000Z',
    shellColor: '#fbdcc2',
    coreColor: '#f0993a',
    tagline: '스트레스 받는 날, 프리츠를 조물조물',
    photo: '/fritz_wakbbu.png',
    background: 'peach',
    sound: 'slime',
    healMode: true,
  },
  {
    id: 'heal-dan',
    name: 'Dan 왁뿌볼',
    author: 'sarah',
    items: [],
    createdAt: '2026-08-07T01:30:00.000Z',
    shellColor: '#cadcf7',
    coreColor: '#2f7fc4',
    tagline: '배포 실패한 날, 댄을 뿌시며 힐링',
    photo: '/dan_wakbbu.png',
    background: 'charcoal',
    sound: 'keycap',
    healMode: true,
  },
]
