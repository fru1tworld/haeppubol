import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import {
  crackThreshold,
  createPhysicsState,
  fracture,
  freeze,
  resistance,
  stepPhysics,
  waxIntegrity,
} from './waxPhysics'
import type { CrackEvent, Rng, WaxCell, WaxGroup, WaxShell } from './waxTypes'

const PRESS = new Vector3(0, 0, 1)
const noDent = (): void => {}

const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const dir = (x: number, y: number, z: number): Vector3 =>
  new Vector3(x, y, z).normalize()

const makeGroup = (cent: Vector3): WaxGroup => ({ cent, c1: 0, c1t: 0, cells: [] })

const addCell = (group: WaxGroup, cent: Vector3, area: number): WaxCell => {
  const cell: WaxCell = {
    poly: [cent.clone(), cent.clone(), cent.clone()],
    cent,
    group,
    nv: 3,
    area,
    c2: 0,
    c2t: 0,
    wear: 0,
    sink: 0,
    alive: true,
    rot: 0,
    tone: 0,
  }
  group.cells.push(cell)
  return cell
}

/** 앞(+Z) 판 하나 + 뒤(-Z) 판 하나짜리 최소 셸 */
const makeShell = (): WaxShell => {
  const front = makeGroup(dir(0, 0, 1))
  addCell(front, dir(0.1, 0, 1), 0.05)
  addCell(front, dir(-0.1, 0.05, 1), 0.12)
  addCell(front, dir(0, -0.1, 1), 0.05)
  const back = makeGroup(dir(0, 0, -1))
  addCell(back, dir(0.1, 0, -1), 0.05)
  addCell(back, dir(-0.1, 0, -1), 0.05)
  const groups = [front, back]
  const cells = groups.flatMap((g) => g.cells)
  return {
    groups,
    cells,
    triCount: cells.reduce((s, c) => s + 7 * c.nv, 0),
  }
}

/** 보간을 목표값으로 즉시 수렴시킨다 (렌더 루프의 dt·9 / dt·7 보간 대역) */
const settle = (shell: WaxShell): void => {
  for (const g of shell.groups) g.c1 = g.c1t
  for (const c of shell.cells) c.c2 = c.c2t
}

describe('crackThreshold / resistance', () => {
  it('냉동(temp=0) 임계가 상온(temp=1)보다 낮다', () => {
    expect(crackThreshold(1, 0)).toBeLessThan(crackThreshold(1, 1))
    expect(crackThreshold(0.4, 0)).toBeLessThan(crackThreshold(0.4, 1))
  })

  it('레퍼런스 수식과 일치한다', () => {
    expect(crackThreshold(1, 1)).toBeCloseTo(0.84)
    expect(crackThreshold(0, 0)).toBeCloseTo(0.22 * 0.6)
    expect(resistance(1, 0, 1)).toBeCloseTo(1)
    expect(resistance(1, 1, 1)).toBeCloseTo(0.58)
  })

  it('give가 클수록 저항이 낮고, 냉동일수록 저항이 높다', () => {
    expect(resistance(1, 1, 1)).toBeLessThan(resistance(1, 0, 1))
    expect(resistance(1, 0, 0)).toBeGreaterThan(resistance(1, 0, 1))
  })
})

describe('fracture 캐스케이드', () => {
  it('1단: 반경 내 안 깨진 큰 판만 깨진다 (size 1.0)', () => {
    const shell = makeShell()
    const evts = fracture(shell, PRESS, 1.0, 1, mulberry32(1), noDent)
    expect(evts.length).toBe(1)
    expect(evts[0].size).toBe(1.0)
    expect(shell.groups[0].c1t).toBe(1)
    expect(shell.groups[1].c1t).toBe(0)
    // 잔조각은 아직 안 건드린다
    expect(shell.cells.every((c) => c.c2t === 0)).toBe(true)
  })

  it('2단: 큰 판이 비면 잔조각이 깨진다 (0.26~0.82, sink+0.20)', () => {
    const shell = makeShell()
    const rng = mulberry32(1)
    fracture(shell, PRESS, 1.0, 1, rng, noDent)
    const evts = fracture(shell, PRESS, 1.0, 1, rng, noDent)
    expect(evts.length).toBe(3)
    for (const e of evts) {
      expect(e.size).toBeGreaterThanOrEqual(0.26)
      expect(e.size).toBeLessThanOrEqual(0.82)
    }
    const front = shell.groups[0]
    expect(front.cells.every((c) => c.c2t === 1)).toBe(true)
    expect(front.cells.every((c) => c.sink === 0.2)).toBe(true)
    // area 0.12 셀은 0.26 + 0.12·2.2 = 0.524
    expect(evts[0].size).toBeCloseTo(0.524)
  })

  it('3단: 잔조각도 비면 갈기 (wear/sink 증가, size 0.09~0.22)', () => {
    const shell = makeShell()
    const rng = mulberry32(1)
    fracture(shell, PRESS, 1.0, 1, rng, noDent)
    fracture(shell, PRESS, 1.0, 1, rng, noDent)
    const evts = fracture(shell, PRESS, 1.0, 1, rng, noDent)
    expect(evts.length).toBe(3)
    for (const e of evts) {
      expect(e.size).toBeGreaterThanOrEqual(0.09)
      expect(e.size).toBeLessThanOrEqual(0.22)
    }
    for (const c of shell.groups[0].cells) {
      expect(c.wear).toBeGreaterThanOrEqual(0.18)
      expect(c.sink).toBeCloseTo(0.38)
    }
  })

  it('갈다 보면 wear가 1에 닿아 셀이 죽고, 다 죽으면 이벤트 0', () => {
    const shell = makeShell()
    const rng = mulberry32(1)
    for (let i = 0; i < 40; i++) fracture(shell, PRESS, 1.0, 1, rng, noDent)
    const front = shell.groups[0]
    expect(front.cells.every((c) => !c.alive && c.wear === 1)).toBe(true)
    // 앞면은 전멸 — 같은 방향으로는 더 이상 아무 일도 없다
    expect(fracture(shell, PRESS, 1.0, 1, rng, noDent)).toEqual([])
  })

  it('이벤트는 size 내림차순, delayMs는 첫 0 / 이후 6+rng·30·i', () => {
    const shell = makeShell()
    const rng = mulberry32(2)
    fracture(shell, PRESS, 1.0, 1, rng, noDent)
    const evts = fracture(shell, PRESS, 1.0, 1, rng, noDent)
    expect(evts.length).toBeGreaterThan(1)
    expect(evts[0].delayMs).toBe(0)
    for (let i = 1; i < evts.length; i++) {
      expect(evts[i].size).toBeLessThanOrEqual(evts[i - 1].size)
      expect(evts[i].delayMs).toBeGreaterThanOrEqual(6)
      expect(evts[i].delayMs).toBeLessThanOrEqual(6 + 30 * i)
    }
  })

  it('이벤트가 있을 때만 onDent를 힘 기반 depth/rad로 부른다', () => {
    const shell = makeShell()
    const calls: [number, number][] = []
    fracture(shell, PRESS, 1.0, 1, mulberry32(1), (_d, depth, radAng) => {
      calls.push([depth, radAng])
    })
    expect(calls).toEqual([[0.03 + 0.055 * 1.0, 0.3 + 0.1 * 1.0]])
    // 뒤쪽으로 누르면(반경 밖) 이벤트도 dent도 없다 — 앞쪽만 있는 힘 0.2
    const shell2 = makeShell()
    shell2.groups[1].c1t = 1
    for (const c of shell2.groups[1].cells) c.alive = false
    const calls2: number[] = []
    const evts = fracture(shell2, new Vector3(0, 0, -1), 0.2, 1, mulberry32(1), () =>
      calls2.push(1),
    )
    expect(evts).toEqual([])
    expect(calls2).toEqual([])
  })

  it('같은 rng 시드면 이벤트 목록과 셸 변형이 동일하다', () => {
    const run = (): { evts: CrackEvent[][]; wear: number[] } => {
      const shell = makeShell()
      const rng = mulberry32(42)
      const evts: CrackEvent[][] = []
      for (let i = 0; i < 6; i++)
        evts.push(fracture(shell, PRESS, 1.2, 1, rng, noDent))
      return { evts, wear: shell.cells.map((c) => c.wear) }
    }
    const a = run()
    const b = run()
    expect(a.evts).toEqual(b.evts)
    expect(a.wear).toEqual(b.wear)
  })
})

describe('waxIntegrity', () => {
  it('파괴가 진행될수록 단조감소한다', () => {
    const shell = makeShell()
    const rng = mulberry32(3)
    let prev = waxIntegrity(shell)
    expect(prev).toBe(1)
    for (let i = 0; i < 40; i++) {
      fracture(shell, PRESS, 1.0, 1, rng, noDent)
      settle(shell)
      const now = waxIntegrity(shell)
      expect(now).toBeLessThanOrEqual(prev)
      prev = now
    }
    // 앞면 전멸 + 뒷면 무손상 → 뒷면 2/5셀만 남는다
    expect(prev).toBeCloseTo(2 / 5)
  })

  it('셀이 없으면 0', () => {
    expect(waxIntegrity({ groups: [], cells: [], triCount: 0 })).toBe(0)
  })
})

describe('stepPhysics', () => {
  const stepUntilCrack = (
    shell: WaxShell,
    state = createPhysicsState(),
    rng = mulberry32(5),
  ): { evts: CrackEvent[]; prevForce: number; nowMs: number } => {
    let now = 1000
    let prevForce = state.force
    for (let i = 0; i < 300; i++) {
      prevForce = state.force
      const evts = stepPhysics(
        state,
        { pressing: true, dt: 0.016, nowMs: now, pressDir: PRESS },
        shell,
        rng,
        noDent,
      )
      if (evts.length) return { evts, prevForce, nowMs: now }
      now += 16
      settle(shell)
    }
    throw new Error('crack did not occur')
  }

  it('힘이 1.75/s로 쌓여 임계를 넘으면 크랙, snap-through로 힘 ×0.50', () => {
    const state = createPhysicsState()
    const { evts, prevForce, nowMs } = stepUntilCrack(makeShell(), state)
    expect(evts.length).toBe(1)
    expect(state.cracks).toBe(1)
    expect(state.lastFractureMs).toBe(nowMs)
    expect(state.force).toBeCloseTo((prevForce + 0.016 * 1.75) * 0.5)
  })

  it('크랙 직후 저항 급락(give), 시간이 지나면 -4.0/s로 회복', () => {
    const state = createPhysicsState()
    stepUntilCrack(makeShell(), state)
    // 크랙 틱에서 give=1 후 같은 틱의 감쇠 1회분만 빠져 있다
    expect(state.give).toBeCloseTo(1 - 0.016 * 4.0)
    const rLow = resistance(state.integrity, state.give, state.temp)
    expect(rLow).toBeLessThan(resistance(state.integrity, 0, state.temp))
    let now = 10000
    for (let i = 0; i < 30; i++) {
      stepPhysics(
        state,
        { pressing: false, dt: 0.016, nowMs: now, pressDir: PRESS },
        makeShell(),
        mulberry32(5),
        noDent,
      )
      now += 16
    }
    expect(state.give).toBe(0)
    expect(resistance(state.integrity, state.give, state.temp)).toBeGreaterThan(rLow)
  })

  it('마지막 파괴 후 45ms가 지나기 전에는 다시 깨지 않는다', () => {
    const shell = makeShell()
    const state = createPhysicsState()
    const { nowMs } = stepUntilCrack(shell, state)
    settle(shell)
    state.force = 1.4 // 임계 훨씬 위
    const evts = stepPhysics(
      state,
      { pressing: true, dt: 0.016, nowMs: nowMs + 16, pressDir: PRESS },
      shell,
      mulberry32(5),
      noDent,
    )
    expect(evts).toEqual([])
    // 45ms가 지나면 다음 단계가 깨진다
    const evts2 = stepPhysics(
      state,
      { pressing: true, dt: 0.016, nowMs: nowMs + 60, pressDir: PRESS },
      shell,
      mulberry32(5),
      noDent,
    )
    expect(evts2.length).toBeGreaterThan(0)
  })

  it('비압착이면 힘이 4.2/s로 빠지고 squash는 dt·20으로 따라간다', () => {
    const state = createPhysicsState()
    state.force = 1.0
    state.squash = 1.0
    stepPhysics(
      state,
      { pressing: false, dt: 0.1, nowMs: 1000, pressDir: PRESS },
      makeShell(),
      mulberry32(5),
      noDent,
    )
    expect(state.force).toBeCloseTo(1.0 - 0.1 * 4.2)
    const tSq = state.force / resistance(1, 0, 1)
    expect(state.squash).toBeCloseTo(1.0 + (tSq - 1.0) * Math.min(1, 0.1 * 20))
  })

  it('왁스 전멸: 이벤트 0, 대신 클레이 dent 콜백만 온다', () => {
    const shell = makeShell()
    for (const g of shell.groups) {
      g.c1t = 1
      g.c1 = 1
    }
    for (const c of shell.cells) {
      c.c2 = 1
      c.c2t = 1
      c.wear = 1
      c.alive = false
    }
    const state = createPhysicsState()
    state.force = 1.0
    const dents: [number, number][] = []
    const evts = stepPhysics(
      state,
      { pressing: true, dt: 0.016, nowMs: 1000, pressDir: PRESS },
      shell,
      mulberry32(5),
      (_d, depth, radAng) => dents.push([depth, radAng]),
    )
    expect(evts).toEqual([])
    expect(state.cracks).toBe(0)
    expect(dents).toEqual([[0.006, 0.34]])
    expect(state.force).toBeLessThanOrEqual(state.threshold * 0.96)
    expect(state.integrity).toBe(0)
    expect(state.dead).toBe(true)
  })

  it('냉동하면 임계가 내려가고 90초에 걸쳐 해동된다', () => {
    const state = createPhysicsState()
    freeze(state)
    expect(state.temp).toBe(0)
    stepPhysics(
      state,
      { pressing: false, dt: 0.1, nowMs: 1000, pressDir: PRESS },
      makeShell(),
      mulberry32(5),
      noDent,
    )
    expect(state.temp).toBeCloseTo(0.1 / 90)
    expect(state.threshold).toBeLessThan(crackThreshold(1, 1))
    for (let i = 0; i < 900; i++) {
      stepPhysics(
        state,
        { pressing: false, dt: 0.1, nowMs: 1000 + i, pressDir: PRESS },
        makeShell(),
        mulberry32(5),
        noDent,
      )
    }
    expect(state.temp).toBe(1)
  })

  it('냉동 상태에서는 더 약한 힘으로 깨진다', () => {
    const warm = createPhysicsState()
    const cold = createPhysicsState()
    freeze(cold)
    const { prevForce: warmForce } = stepUntilCrack(makeShell(), warm)
    const { prevForce: coldForce } = stepUntilCrack(makeShell(), cold)
    expect(coldForce).toBeLessThan(warmForce)
  })
})
