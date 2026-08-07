interface CrewBall {
  readonly id: string
  readonly name: string
  readonly author: string
  readonly items: readonly string[]
  readonly createdAt: string
  readonly shellColor?: string
  readonly coreColor?: string
}

export const CREW_BALLS: readonly CrewBall[] = [
  {
    id: 'crew-lunch-ladder',
    name: '성수 점심 사다리',
    author: '결제모듈 크루',
    items: ['지우관', '효자동', '오토김밥', '우콘커리', '이북집'],
    createdAt: '2026-08-03T03:00:00.000Z',
    shellColor: '#fbdcc2',
    coreColor: '#e0405c',
  },
  {
    id: 'crew-code-review',
    name: '코드리뷰 당번 뽑기',
    author: '코어 크루',
    items: ['아이작', '토스트', '프리츠', '헤일리'],
    createdAt: '2026-08-04T02:30:00.000Z',
    shellColor: '#cadcf7',
    coreColor: '#2f7fc4',
  },
  {
    id: 'crew-deploy-duty',
    name: '이번 주 배포 당번',
    author: '페이먼츠 크루',
    items: ['월요일', '화요일', '수요일', '목요일', '금요일'],
    createdAt: '2026-08-05T01:00:00.000Z',
    shellColor: '#c8ebdc',
    coreColor: '#4f9e5f',
  },
  {
    id: 'crew-mingle-group',
    name: '밍글 점심조 추첨',
    author: '피플 크루',
    items: ['1조', '2조', '3조', '4조', '5조'],
    createdAt: '2026-08-06T05:00:00.000Z',
    shellColor: '#ddcef3',
    coreColor: '#7c4dbd',
  },
  {
    id: 'crew-standup-order',
    name: '스탠드업 발표 순서',
    author: '데이터 크루',
    items: ['결제', '정산', '수납', '온보딩', '파트너'],
    createdAt: '2026-08-07T00:30:00.000Z',
    shellColor: '#8f8a97',
    coreColor: '#f0993a',
  },
]
