import type { Vector3 } from 'three'
import type { CrackEvent, PhysicsState, Rng, WaxShell } from './waxTypes'

// 물성/파괴 코어. 레퍼런스 wakbboolball-3d.html 543~596행(상태·파괴),
// 743~781행(프레임 물리)의 순수 함수 이식.
// dent 반영은 onDent 콜백으로 위임한다 (deformField 직접 의존 없음).

export type OnDent = (dir: Vector3, depth: number, radAng: number) => void

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v))

/**
 * 추첨 왁뿌볼(점메추·밍글·커스텀)이 결과를 공개하는 파괴 진행도(= 1 - integrity).
 * 완파(integrity < 0.06)까지 갈아야 했던 걸 절반 지점으로 당긴 값이다.
 */
export const SMASH_REVEAL_AT = 0.5

/** 셀별 max(0, 1 - 0.22·c1 - 0.30·c2 - 0.48·wear) 평균. 죽은 셀은 0 취급 */
export function waxIntegrity(shell: WaxShell): number {
  let s = 0
  for (const c of shell.cells) {
    if (!c.alive) continue
    s += Math.max(0, 1 - 0.22 * c.group.c1 - 0.3 * c.c2 - 0.48 * c.wear)
  }
  return shell.cells.length ? s / shell.cells.length : 0
}

/** 파괴가 시작되는 힘. 냉동(temp→0)일수록 낮다 = 취성 */
export const crackThreshold = (integrity: number, temp: number): number =>
  (0.22 + 0.62 * integrity) * (0.6 + 0.4 * temp)

/** 압착 저항. 크랙 직후(give=1) 급락, 냉동일수록 단단 */
export const resistance = (integrity: number, give: number, temp: number): number =>
  (0.34 + 0.66 * integrity) * (1 - 0.42 * give) * (1 + 0.18 * (1 - temp))

/**
 * 3단 파괴 캐스케이드. shell을 직접 변형(c1t/c2t/wear/sink/alive)한다.
 * 1. 반경 내 안 깨진 큰 판  2. 깨진 판의 잔조각  3. 이미 깨진 잔조각 갈기.
 * 이벤트가 있으면 onDent로 소성 눌림을 위임하고, size 내림차순으로
 * 최대 13개에 delayMs(첫 0, 이후 6+rng·30·i)를 부여해 돌려준다.
 */
export function fracture(
  shell: WaxShell,
  pressDir: Vector3,
  force: number,
  temp: number,
  rng: Rng,
  onDent: OnDent,
): CrackEvent[] {
  const f = Math.min(force, 1.4)
  const rad = (0.60 + 0.85 * f) * (1 + (1 - temp) * 0.42)
  const cosR = Math.cos(rad)
  const sizes: number[] = []

  for (const g of shell.groups) {
    if (g.c1t >= 1) continue
    if (g.cent.dot(pressDir) > cosR) {
      g.c1t = 1
      sizes.push(1.0)
    }
  }
  if (!sizes.length) {
    for (const c of shell.cells) {
      if (!c.alive || c.c2t >= 1 || c.group.c1t < 1) continue
      if (c.cent.dot(pressDir) <= cosR) continue
      c.c2t = 1
      c.sink = Math.min(1, c.sink + 0.2)
      sizes.push(clamp(0.26 + c.area * 2.2, 0.26, 0.82))
    }
  }
  if (!sizes.length) {
    const cosR2 = Math.cos(rad * 1.15)
    let n = 0
    for (const c of shell.cells) {
      if (!c.alive || c.c2t < 1) continue
      if (c.cent.dot(pressDir) <= cosR2) continue
      c.wear = Math.min(1, c.wear + 0.18 + rng() * 0.16)
      c.sink = Math.min(1, c.sink + 0.18)
      sizes.push(0.09 + rng() * 0.13)
      if (c.wear >= 1) c.alive = false
      if (++n > 18) break
    }
  }
  if (!sizes.length) return []

  onDent(pressDir, 0.03 + 0.055 * f, 0.3 + 0.1 * f)

  sizes.sort((a, b) => b - a)
  return sizes
    .slice(0, 13)
    .map((size, i) => ({ size, delayMs: i === 0 ? 0 : 6 + rng() * 30 * i }))
}

export function createPhysicsState(): PhysicsState {
  return {
    integrity: 1,
    force: 0,
    threshold: 1,
    squash: 0,
    give: 0,
    temp: 1,
    cracks: 0,
    dead: false,
    lastFractureMs: 0,
  }
}

/** 냉동실. 이후 stepPhysics가 90초에 걸쳐 해동한다 */
export function freeze(state: PhysicsState): void {
  state.temp = 0
}

export interface StepInput {
  pressing: boolean
  /** 초 단위. 호출측이 클램프(레퍼런스는 0.10)해서 넘긴다 */
  dt: number
  nowMs: number
  pressDir: Vector3
}

/**
 * 프레임 1회분 물리. state와 shell을 변형하고, 이번 프레임의 크랙
 * 이벤트를 돌려준다(없으면 빈 배열).
 * 힘 적분 +2.625/s(상한 1.5), 크랙 시 snap-through ×0.50, 비압착 감쇠
 * -4.2/s, give -4.0/s, squash 보간 dt·20, 최소 파괴 간격 45ms,
 * 해동 90초, integrity<0.06이면 dead.
 */
export function stepPhysics(
  state: PhysicsState,
  input: StepInput,
  shell: WaxShell,
  rng: Rng,
  onDent: OnDent,
): CrackEvent[] {
  const { pressing, dt, nowMs, pressDir } = input

  if (state.temp < 1) state.temp = Math.min(1, state.temp + dt / 90)
  state.integrity = waxIntegrity(shell)
  state.threshold = crackThreshold(state.integrity, state.temp)
  if (state.integrity < 0.06) state.dead = true

  let evts: CrackEvent[] = []
  if (pressing) {
    state.force = Math.min(1.5, state.force + dt * 2.625)
    if (state.force > state.threshold && nowMs - state.lastFractureMs > 30) {
      evts = fracture(shell, pressDir, state.force, state.temp, rng, onDent)
      if (evts.length) {
        state.cracks += evts.length
        state.give = 1
        state.force *= 0.5
        state.lastFractureMs = nowMs
      } else {
        // 왁스가 없어도 클레이는 계속 구겨진다
        state.force = Math.min(state.force, state.threshold * 0.96)
        onDent(pressDir, 0.006, 0.34)
      }
    }
  } else {
    state.force = Math.max(0, state.force - dt * 4.2)
  }
  state.give = Math.max(0, state.give - dt * 4.0)

  const tSq = clamp(
    state.force / resistance(state.integrity, state.give, state.temp),
    0,
    1.35,
  )
  state.squash += (tSq - state.squash) * Math.min(1, dt * 20)
  return evts
}
