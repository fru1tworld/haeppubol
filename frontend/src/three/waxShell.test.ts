import { describe, it, expect } from 'vitest'
import type { Rng } from './waxTypes'
import { buildShell } from './waxShell'

// 레퍼런스와 동일한 LCG. 시드만 주입식으로 바꿨다.
function makeRng(seedInit: number): Rng {
  let seed = seedInit
  return () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

describe('buildShell', () => {
  const shell = buildShell(makeRng(20260807))

  it('같은 rng 시드면 동일한 셸이 나온다', () => {
    const other = buildShell(makeRng(20260807))
    expect(other.groups.length).toBe(shell.groups.length)
    expect(other.cells.length).toBe(shell.cells.length)
    expect(other.triCount).toBe(shell.triCount)
    for (let i = 0; i < shell.cells.length; i++) {
      const a = shell.cells[i]
      const b = other.cells[i]
      expect(b.nv).toBe(a.nv)
      expect(b.area).toBe(a.area)
      expect(b.rot).toBe(a.rot)
      expect(b.tone).toBe(a.tone)
      expect(b.cent.toArray()).toEqual(a.cent.toArray())
      for (let v = 0; v < a.poly.length; v++) {
        expect(b.poly[v].toArray()).toEqual(a.poly[v].toArray())
      }
    }
  })

  it('다른 시드면 다른 셸이 나온다', () => {
    const other = buildShell(makeRng(1))
    const same =
      other.cells.length === shell.cells.length &&
      other.cells.every((c, i) => c.rot === shell.cells[i].rot)
    expect(same).toBe(false)
  })

  it('큰 판이 22개다', () => {
    expect(shell.groups).toHaveLength(22)
  })

  it('모든 셀의 poly가 3개 이상 정점을 가진다', () => {
    for (const c of shell.cells) {
      expect(c.poly.length).toBeGreaterThanOrEqual(3)
      expect(c.nv).toBe(c.poly.length)
    }
  })

  it('poly 정점과 셀 중심은 단위 구면 위에 있다', () => {
    for (const c of shell.cells) {
      expect(c.cent.length()).toBeCloseTo(1, 6)
      for (const p of c.poly) expect(p.length()).toBeCloseTo(1, 6)
    }
  })

  it('셀 중심이 자기 그룹 캡(1.15rad) 안에 있다', () => {
    const cosCap = Math.cos(1.15)
    for (const c of shell.cells) {
      expect(c.cent.dot(c.group.cent)).toBeGreaterThan(cosCap)
    }
  })

  it('그룹의 cells와 전체 cells가 일치한다', () => {
    const fromGroups = shell.groups.flatMap(g => g.cells)
    expect(fromGroups).toHaveLength(shell.cells.length)
    for (const g of shell.groups) {
      for (const c of g.cells) expect(c.group).toBe(g)
    }
  })

  it('잔조각 총수가 기대 범위(약 165)다', () => {
    expect(shell.cells.length).toBeGreaterThanOrEqual(22 * 6)
    expect(shell.cells.length).toBeLessThanOrEqual(22 * 9)
  })

  it('triCount = 시그마 7·nv', () => {
    const sum = shell.cells.reduce((s, c) => s + 7 * c.nv, 0)
    expect(shell.triCount).toBe(sum)
    expect(shell.triCount).toBeGreaterThan(0)
  })

  it('셀 초기 상태가 계약대로다', () => {
    for (const c of shell.cells) {
      expect(c.alive).toBe(true)
      expect(c.c2).toBe(0)
      expect(c.c2t).toBe(0)
      expect(c.wear).toBe(0)
      expect(c.sink).toBe(0)
      expect(c.area).toBeGreaterThan(0)
      expect(Math.abs(c.rot)).toBeLessThanOrEqual(0.375)
      expect(Math.abs(c.tone)).toBeLessThanOrEqual(0.035)
    }
  })
})
