import { describe, expect, it } from 'vitest'
import { PICK_COUNT, pickSome } from './mingleRule'

const TEAMS = ['풋살', '볼링', '원데이', '등산', '보드게임']

describe('밍글 뽑기', () => {
  it('매달 2팀이다', () => {
    expect(PICK_COUNT).toBe(2)
  })

  it('중복 없이 n개를 뽑는다', () => {
    const picked = pickSome(TEAMS, PICK_COUNT)
    expect(picked).toHaveLength(PICK_COUNT)
    expect(new Set(picked).size).toBe(PICK_COUNT)
    picked.forEach(p => expect(TEAMS).toContain(p))
  })

  it('후보가 뽑을 수보다 적으면 있는 만큼만 뽑는다', () => {
    expect(pickSome(['풋살'], PICK_COUNT)).toEqual(['풋살'])
    expect(pickSome([], PICK_COUNT)).toEqual([])
  })

  it('모든 팀이 뽑힐 수 있다', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) pickSome(TEAMS, PICK_COUNT).forEach(t => seen.add(t))
    expect(seen.size).toBe(TEAMS.length)
  })
})
