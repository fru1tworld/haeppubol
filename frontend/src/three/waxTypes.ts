import type { Vector3 } from 'three'

// 왁뿌볼 3D 시뮬레이터의 모듈 간 계약.
// 병렬 작업의 seam이므로 구현을 두지 않는다. task/wakbbuball-3d.md 참고.

export type Rng = () => number

// ── 왁스 셸 (waxShell.ts) ────────────────────────────────

/** 큰 판. 1단 파괴(coarse)의 단위 */
export interface WaxGroup {
  cent: Vector3
  /** 크랙 진행도(보간된 현재값) */
  c1: number
  /** 크랙 목표값. 0 또는 1 */
  c1t: number
  cells: WaxCell[]
}

/** 잔조각. 2단 파괴(fine)와 3단 갈기(grind)의 단위 */
export interface WaxCell {
  poly: Vector3[]
  cent: Vector3
  group: WaxGroup
  nv: number
  /** 입체각 근사. 조각 크기 → 소리 크기에 쓰인다 */
  area: number
  c2: number
  c2t: number
  /** 갈림 정도. 1이면 사라진다 */
  wear: number
  /** 눌려 들어간 정도 */
  sink: number
  alive: boolean
  /** 깨졌을 때 기울어지는 각 */
  rot: number
  /** 조각별 색 편차 */
  tone: number
}

export interface WaxShell {
  groups: WaxGroup[]
  cells: WaxCell[]
  /** 왁스 메시 버퍼 크기 계산용. Σ 7·nv */
  triCount: number
}

// ── 변형장 (deformField.ts) ─────────────────────────────

/** 소성 눌림. 영구히 남는다 */
export interface Dent {
  dir: Vector3
  depth: number
  cosr: number
  invr: number
}

/** 탄성 압착. 떼면 복원된다 */
export interface Squeeze {
  dir: Vector3
  depth: number
  cosr: number
  invr: number
}

export interface DeformState {
  dents: Dent[]
  squeeze: Squeeze
  /** 체적 보존 팽창 */
  bulge: number
  /** 누적 소성 변형. 회복하지 않는다 */
  plasticTotal: number
}

/** 지오메트리 빌더가 의존하는 변형장 인터페이스 */
export interface DeformField {
  /** 왁스판이 얹히는 매끈한 기준면 */
  smooth: (d: Vector3) => number
  /** 주름까지 포함한 클레이 표면 */
  clay: (d: Vector3) => number
  strain: (d: Vector3) => number
}

// ── 물성/파괴 (waxPhysics.ts) ───────────────────────────

export interface PhysicsState {
  integrity: number
  force: number
  threshold: number
  /** 눌린 정도(force / resistance) */
  squash: number
  /** snap-through 직후 저항이 꺾인 정도 */
  give: number
  /** 0 = -18°C, 1 = 22°C */
  temp: number
  cracks: number
  dead: boolean
  lastFractureMs: number
}

/** 파괴 한 건. 사운드 트랜지언트 1개와 1:1 대응한다 */
export interface CrackEvent {
  size: number
  delayMs: number
}

export interface PhysicsSnapshot {
  integrity: number
  force: number
  threshold: number
  plasticTotal: number
  temp: number
  cracks: number
  shardsLeft: number
}
