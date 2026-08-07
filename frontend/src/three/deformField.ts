import { Vector3 } from 'three'
import type { DeformField, DeformState } from './waxTypes'

// 구면 스칼라 변형장. 레퍼런스의 모듈 전역 DENTS/bulge/plasticTotal을
// DeformState를 명시적으로 받는 순수 함수로 옮겼다 (sans-IO).

const SQUEEZE_RAD = 0.95

// ── 해시 노이즈 (구겨짐용) ──────────────────────────────

export function h3(i: number, j: number, k: number): number {
  let n = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

export function vnoise(x: number, y: number, z: number): number {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z)
  const fx = x - i, fy = y - j, fz = z - k
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz)
  const c000 = h3(i, j, k), c100 = h3(i + 1, j, k), c010 = h3(i, j + 1, k), c110 = h3(i + 1, j + 1, k)
  const c001 = h3(i, j, k + 1), c101 = h3(i + 1, j, k + 1), c011 = h3(i, j + 1, k + 1), c111 = h3(i + 1, j + 1, k + 1)
  const x00 = c000 + (c100 - c000) * ux, x10 = c010 + (c110 - c010) * ux
  const x01 = c001 + (c101 - c001) * ux, x11 = c011 + (c111 - c011) * ux
  const y0 = x00 + (x10 - x00) * uy, y1 = x01 + (x11 - x01) * uy
  return y0 + (y1 - y0) * uz
}

export const ridged = (x: number, y: number, z: number): number =>
  1 - Math.abs(2 * vnoise(x, y, z) - 1)

// ── 상태 ────────────────────────────────────────────────

export function createDeformState(): DeformState {
  const cosr = Math.cos(SQUEEZE_RAD)
  return {
    dents: [],
    squeeze: { dir: new Vector3(0, 1, 0), depth: 0, cosr, invr: 1 / (1 - cosr) },
    bulge: 0,
    plasticTotal: 0,
  }
}

/** 소성 눌림 추가. 가까운 dent(dot > 0.982)는 병합, 최대 20개 유지 */
export function addDent(state: DeformState, dir: Vector3, depth: number, radAng: number): void {
  const cosr = Math.cos(radAng)
  for (const d of state.dents) {
    if (d.dir.dot(dir) > 0.982) {
      d.depth = Math.min(0.22, d.depth + depth * 0.72)
      d.dir.lerp(dir, 0.30).normalize()
      state.plasticTotal += depth * 0.72
      return
    }
  }
  state.dents.push({ dir: dir.clone(), depth: Math.min(0.20, depth), cosr, invr: 1 / (1 - cosr) })
  state.plasticTotal += depth
  if (state.dents.length > 20) state.dents.shift()
}

/** smoothstep 감쇠. 캡 밖(ca <= cosr)은 0 */
export function fall(ca: number, cosr: number, invr: number): number {
  if (ca <= cosr) return 0
  const t = (ca - cosr) * invr
  return t * t * (3 - 2 * t)
}

/** 매끈한 변형 (왁스 판이 얹히는 기준면) */
export function deformSmooth(state: DeformState, d: Vector3): number {
  let s = 0, near = 0
  for (let i = 0; i < state.dents.length; i++) {
    const k = state.dents[i], f = fall(d.dot(k.dir), k.cosr, k.invr)
    if (f > 0) { s -= k.depth * f; if (f > near) near = f }
  }
  const sq = state.squeeze
  const f2 = fall(d.dot(sq.dir), sq.cosr, sq.invr)
  if (f2 > 0) { s -= sq.depth * f2; if (f2 > near) near = f2 }
  s += state.bulge * (1 - near * 0.92) // 체적 보존 팽창
  return s
}

export function strainAt(state: DeformState, d: Vector3): number {
  let s = 0
  for (let i = 0; i < state.dents.length; i++) {
    const k = state.dents[i]
    s += k.depth * fall(d.dot(k.dir), k.cosr, k.invr)
  }
  return s
}

/** 클레이 표면 = 매끈 변형 + 구겨진 주름 (ridged 2옥타브 x strain) */
export function deformClay(state: DeformState, d: Vector3): number {
  const st = Math.min(1, strainAt(state, d) * 8.0)
  let s = deformSmooth(state, d)
  if (st > 0.02) {
    const r1 = ridged(d.x * 6.5 + 11, d.y * 6.5 + 3, d.z * 6.5 + 7) - 0.5
    const r2 = ridged(d.x * 15.0 + 41, d.y * 15.0 + 17, d.z * 15.0 + 29) - 0.5
    s += (r1 * 0.055 + r2 * 0.022) * st
  }
  return s
}

/** 눌린 부피(Σ depth·(1-cosr))에 비례하는 체적 보존 팽창 갱신 */
export function updateBulge(state: DeformState): void {
  let dv = 0
  for (const k of state.dents) dv += k.depth * (1 - k.cosr)
  dv += state.squeeze.depth * (1 - state.squeeze.cosr)
  state.bulge = dv * 0.42
}

/** 지오메트리 빌더용 DeformField 뷰 */
export function fieldOf(state: DeformState): DeformField {
  return {
    smooth: d => deformSmooth(state, d),
    clay: d => deformClay(state, d),
    strain: d => strainAt(state, d),
  }
}
