import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import type { DeformField, WaxShell } from './waxTypes'

// 왁스 셸 지오메트리 빌더. 레퍼런스 wakbboolball-3d.html 421~541행 이식.
// 변형장은 waxTypes.ts의 DeformField 인터페이스로만 받는다.

/** 왁스 두께 */
const TH = 0.05

const WAX_BASE: readonly [number, number, number] = [0.96, 0.935, 0.885]
const WAX_DEEP: readonly [number, number, number] = [0.52, 0.47, 0.4]

/** 왁스 색. 선형 색공간 — 정점 색 버퍼에 그대로 들어간다 */
export interface WaxPalette {
  /** 겉면/안쪽면 */
  base: readonly [number, number, number]
  /** 깨진 단면 */
  deep: readonly [number, number, number]
}

export const DEFAULT_WAX_PALETTE: WaxPalette = { base: WAX_BASE, deep: WAX_DEEP }

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

// ── 유한차분 법선 ────────────────────────────────────────
const _naR = new Vector3()
const _naT1 = new Vector3()
const _naT2 = new Vector3()
const _naA = new Vector3()
const _naB = new Vector3()
const _naP0 = new Vector3()
const _naPA = new Vector3()
const _naPB = new Vector3()

/** 방향 d에서 반경장 fn의 유한차분 법선 (e=0.035) */
export function normalAt(d: Vector3, fn: (d: Vector3) => number, out: Vector3): Vector3 {
  if (Math.abs(d.z) < 0.9) _naR.set(0, 0, 1)
  else _naR.set(1, 0, 0)
  _naT1.crossVectors(d, _naR).normalize()
  _naT2.crossVectors(d, _naT1)
  const e = 0.035
  _naA.copy(d).addScaledVector(_naT1, e).normalize()
  _naB.copy(d).addScaledVector(_naT2, e).normalize()
  const h0 = 1 + fn(d)
  const ha = 1 + fn(_naA)
  const hb = 1 + fn(_naB)
  _naP0.copy(d).multiplyScalar(h0)
  _naPA.copy(_naA).multiplyScalar(ha).sub(_naP0)
  _naPB.copy(_naB).multiplyScalar(hb).sub(_naP0)
  return out.crossVectors(_naPA, _naPB).normalize()
}

// ── 버퍼 ────────────────────────────────────────────────

export interface WaxBuffers {
  geometry: BufferGeometry
  position: Float32Array
  normal: Float32Array
  color: Float32Array
  triCount: number
  /** 새 셸의 triCount에 맞춰 배열을 재할당하고 어태치한다 */
  realloc: (triCount: number) => void
}

/** position/normal/color Float32Array(각 triCount·9)를 만들어 BufferGeometry에 어태치한다 */
export function createWaxBuffers(triCount: number): WaxBuffers {
  const geometry = new BufferGeometry()
  const buffers: WaxBuffers = {
    geometry,
    position: new Float32Array(0),
    normal: new Float32Array(0),
    color: new Float32Array(0),
    triCount: 0,
    realloc(n: number) {
      buffers.triCount = n
      buffers.position = new Float32Array(n * 9)
      buffers.normal = new Float32Array(n * 9)
      buffers.color = new Float32Array(n * 9)
      geometry.setAttribute('position', new BufferAttribute(buffers.position, 3))
      geometry.setAttribute('normal', new BufferAttribute(buffers.normal, 3))
      geometry.setAttribute('color', new BufferAttribute(buffers.color, 3))
    },
  }
  buffers.realloc(triCount)
  return buffers
}

// ── 메쉬 갱신 (모듈 스코프 임시 벡터 재사용으로 GC 압력 회피) ──
const _tmpA = new Vector3()
const _tmpB = new Vector3()
const _tmpC = new Vector3()
const _d = new Vector3()
const _cc = new Vector3()
const _t1 = new Vector3()
const _t2 = new Vector3()
const _N = new Vector3()
const _e1 = new Vector3()
const _e2 = new Vector3()
const _C = new Vector3()
const _sn = new Vector3()
const _sA = new Vector3()
const _sB = new Vector3()
const _ab = new Float64Array(160)
const _cd: Vector3[] = []
const _vo: Vector3[] = []
const _vi: Vector3[] = []
const _no: Vector3[] = []
const _ni: Vector3[] = []
for (let i = 0; i < 80; i++) {
  _vo.push(new Vector3())
  _vi.push(new Vector3())
  _no.push(new Vector3())
  _ni.push(new Vector3())
  if (i < 40) _cd.push(new Vector3())
}
const _tint = [0, 0, 0]

// updateWax 호출 동안만 유효한 상태
let wp = 0
let _rigid = 0
let _th = 0
let _P: Float32Array = new Float32Array(0)
let _Nb: Float32Array = new Float32Array(0)
let _Cb: Float32Array = new Float32Array(0)
let _smooth: (d: Vector3) => number = () => 0

function pushTri(
  a: Vector3,
  b: Vector3,
  c: Vector3,
  na: Vector3,
  nb: Vector3,
  nc: Vector3,
  tint: readonly number[],
): void {
  const P = _P
  const N = _Nb
  const C = _Cb
  const v = [a, b, c]
  const nn = [na, nb, nc]
  for (let i = 0; i < 3; i++) {
    P[wp] = v[i].x
    P[wp + 1] = v[i].y
    P[wp + 2] = v[i].z
    N[wp] = nn[i].x
    N[wp + 1] = nn[i].y
    N[wp + 2] = nn[i].z
    C[wp] = tint[0]
    C[wp + 1] = tint[1]
    C[wp + 2] = tint[2]
    wp += 3
  }
}

// 접선좌표 (a,b) → 블렌드된 월드 위치/법선. w는 구면 위에 있도록 재계산한다.
function shardVert(a: number, b: number, idx: number): void {
  const w = Math.sqrt(Math.max(0, 1 - a * a - b * b))
  // 구면 투영 — 멀쩡한 판은 아래 표면을 그대로 따라간다
  _tmpA.copy(_cc).multiplyScalar(w).addScaledVector(_t1, a).addScaledVector(_t2, b).normalize()
  const hk = 1 + _smooth(_tmpA)
  const sx = _tmpA.x * hk
  const sy = _tmpA.y * hk
  const sz = _tmpA.z * hk
  normalAt(_tmpA, _smooth, _tmpB)
  // 강체판 — 깨진 판은 휘지 않고 기울기만 한다
  const px = _C.x + _e1.x * a + _e2.x * b + _N.x * (w - 1)
  const py = _C.y + _e1.y * a + _e2.y * b + _N.y * (w - 1)
  const pz = _C.z + _e1.z * a + _e2.z * b + _N.z * (w - 1)
  const O = _vo[idx]
  const NN = _no[idx]
  O.set(lerp(sx, px, _rigid), lerp(sy, py, _rigid), lerp(sz, pz, _rigid))
  NN.set(
    lerp(_tmpB.x, _e1.x * a + _e2.x * b + _N.x * w, _rigid),
    lerp(_tmpB.y, _e1.y * a + _e2.y * b + _N.y * w, _rigid),
    lerp(_tmpB.z, _e1.z * a + _e2.z * b + _N.z * w, _rigid),
  ).normalize()
  _vi[idx].copy(O).addScaledVector(NN, -_th)
  _ni[idx].copy(NN).multiplyScalar(-1)
}

/** 셸의 현재 파괴/변형 상태를 왁스 버퍼에 굽는다 */
export function updateWax(
  shell: WaxShell,
  field: DeformField,
  buffers: WaxBuffers,
  palette: WaxPalette = DEFAULT_WAX_PALETTE,
): void {
  wp = 0
  _P = buffers.position
  _Nb = buffers.normal
  _Cb = buffers.color
  _smooth = field.smooth
  const cells = shell.cells
  for (let ci = 0; ci < cells.length; ci++) {
    const c = cells[ci]
    if (!c.alive) continue
    const g = c.group
    const nv = c.nv
    const s1 = g.c1 < 0.002 ? 1 : 1 - g.c1 * 0.035
    const s2 = (c.c2 < 0.002 ? 1 : 1 - c.c2 * 0.075) * (1 - c.wear * 0.34)
    _rigid = Math.min(1, c.c2)
    _th = TH * (1 - c.wear * 0.55)

    // 그룹 수축 후 셀 중심 + 접선 프레임
    _cc.copy(g.cent).multiplyScalar(1 - s1).addScaledVector(c.cent, s1).normalize()
    if (Math.abs(_cc.z) < 0.9) _tmpC.set(0, 0, 1)
    else _tmpC.set(1, 0, 0)
    _t1.crossVectors(_cc, _tmpC).normalize()
    _t2.crossVectors(_cc, _t1)

    normalAt(_cc, _smooth, _N)
    _C.copy(_cc).multiplyScalar(1 + _smooth(_cc)).addScaledVector(_N, -c.sink * 0.055)
    _e1.copy(_t1).addScaledVector(_N, -_t1.dot(_N)).normalize()
    _e2.crossVectors(_N, _e1)
    const ph = c.rot * c.c2 * 0.55
    const cph = Math.cos(ph)
    const sph = Math.sin(ph)

    // 모서리 방향 (그룹 수축 반영)
    for (let k = 0; k < nv; k++)
      _cd[k].copy(g.cent).multiplyScalar(1 - s1).addScaledVector(c.poly[k], s1).normalize()
    // 접선좌표: 중심(0) / 모서리(1..nv) / 변중점(nv+1..) / 반경중점(2nv+1..)
    // 변중점은 "방향 공간"에서 구해야 이웃 조각과 정확히 맞물린다(멀쩡할 때 이음매 0)
    const put = (dir: Vector3, i: number): void => {
      const a = dir.dot(_t1)
      const b = dir.dot(_t2)
      _ab[i * 2] = (a * cph - b * sph) * s2
      _ab[i * 2 + 1] = (a * sph + b * cph) * s2
    }
    for (let k = 0; k < nv; k++) put(_cd[k], k)
    for (let k = 0; k < nv; k++) {
      const k2 = (k + 1) % nv
      _d.copy(_cd[k]).add(_cd[k2]).normalize()
      put(_d, nv + k)
    }
    shardVert(0, 0, 0)
    for (let k = 0; k < nv; k++) shardVert(_ab[k * 2], _ab[k * 2 + 1], 1 + k)
    for (let k = 0; k < nv; k++) shardVert(_ab[(nv + k) * 2], _ab[(nv + k) * 2 + 1], 1 + nv + k)
    for (let k = 0; k < nv; k++) shardVert(_ab[k * 2] * 0.5, _ab[k * 2 + 1] * 0.5, 1 + 2 * nv + k)

    const t = c.tone - c.sink * 0.16
    _tint[0] = clamp(palette.base[0] + t, 0, 1)
    _tint[1] = clamp(palette.base[1] + t, 0, 1)
    _tint[2] = clamp(palette.base[2] + t, 0, 1)

    for (let k = 0; k < nv; k++) {
      const kk = (k + 1) % nv
      const A = 1 + k
      const B = 1 + kk
      const M = 1 + nv + k
      const P = 1 + 2 * nv + k
      const Q = 1 + 2 * nv + kk
      const Cn = 0
      // 바깥면 4분할
      pushTri(_vo[A], _vo[M], _vo[P], _no[A], _no[M], _no[P], _tint)
      pushTri(_vo[M], _vo[B], _vo[Q], _no[M], _no[B], _no[Q], _tint)
      pushTri(_vo[M], _vo[Q], _vo[P], _no[M], _no[Q], _no[P], _tint)
      pushTri(_vo[P], _vo[Q], _vo[Cn], _no[P], _no[Q], _no[Cn], _tint)
      // 안쪽면
      pushTri(_vi[Cn], _vi[B], _vi[A], _ni[Cn], _ni[B], _ni[A], _tint)
      // 옆면(깨진 단면) — 어둡게
      const sn = _sn
        .crossVectors(_sA.subVectors(_vo[B], _vo[A]), _sB.subVectors(_vi[A], _vo[A]))
        .normalize()
      pushTri(_vo[A], _vo[B], _vi[B], sn, sn, sn, palette.deep)
      pushTri(_vo[A], _vi[B], _vi[A], sn, sn, sn, palette.deep)
    }
  }
  // 남은 버퍼는 축퇴 삼각형으로
  buffers.position.fill(0, wp)
  const geo = buffers.geometry
  geo.attributes.position.needsUpdate = true
  geo.attributes.normal.needsUpdate = true
  geo.attributes.color.needsUpdate = true
  geo.computeBoundingSphere()
}

/** 클레이/고무막 정점을 반경장 fn으로 변위시킨다 */
export function updateSoftMesh(
  geo: BufferGeometry,
  base: Float32Array,
  fn: (d: Vector3) => number,
  radius: number,
): void {
  const p = geo.attributes.position.array as Float32Array
  const d = _tmpA
  for (let i = 0; i < p.length; i += 3) {
    d.set(base[i], base[i + 1], base[i + 2]).normalize()
    const h = (1 + fn(d)) * radius
    p[i] = d.x * h
    p[i + 1] = d.y * h
    p[i + 2] = d.z * h
  }
  geo.attributes.position.needsUpdate = true
  geo.computeVertexNormals()
}
