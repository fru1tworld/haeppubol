import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { buildShell } from './waxShell'
import { SMASH_REVEAL_AT, createPhysicsState, stepPhysics } from './waxPhysics'
import type { Rng } from './waxTypes'

// 추첨 왁뿌볼의 "절반 부수면 결과 공개" 계약.
// WaxBall이 보는 진행도는 1 - integrity 하나뿐이므로, 실제 셸을 진짜로 갈아서
// 그 지점이 도달 가능하고 완파보다 확실히 먼저인지 확인한다.

const DEAD_AT = 0.94
const DT = 1 / 60
const FRAMES_PER_SPOT = 90

const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 구면에 고르게 뿌린 누르는 지점들 */
const spiralDirs = (n: number): Vector3[] => {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = golden * i
    return new Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize()
  })
}

/** 구석구석 누르면서 진행도가 각 지점을 넘는 프레임을 기록한다 */
const grind = (seed: number) => {
  const rng = mulberry32(seed)
  const shell = buildShell(rng)
  const physics = createPhysicsState()
  const marks = { reveal: -1, dead: -1 }
  let frame = 0

  for (const pressDir of spiralDirs(40)) {
    for (let i = 0; i < FRAMES_PER_SPOT; i++) {
      stepPhysics(
        physics,
        { pressing: true, dt: DT, nowMs: frame * 16.7, pressDir },
        shell,
        rng,
        () => {},
      )
      frame++
      const progress = 1 - physics.integrity
      if (marks.reveal < 0 && progress >= SMASH_REVEAL_AT) marks.reveal = frame
      if (marks.dead < 0 && progress >= DEAD_AT) marks.dead = frame
    }
  }
  return marks
}

describe('추첨 결과 공개 지점', () => {
  it('절반이다', () => {
    expect(SMASH_REVEAL_AT).toBe(0.5)
  })

  it('실제로 갈다 보면 도달한다', () => {
    expect(grind(11).reveal).toBeGreaterThan(0)
  })

  it('완파보다 먼저 온다 — 예전처럼 다 갈지 않아도 결과가 뜬다', () => {
    for (const seed of [1, 11, 101]) {
      const { reveal, dead } = grind(seed)
      expect(reveal).toBeGreaterThan(0)
      if (dead > 0) expect(reveal).toBeLessThan(dead)
    }
  })
})
