import { Vector3 } from 'three'
import type { Rng, WaxCell, WaxGroup, WaxShell } from './waxTypes'

// 구면 보로노이 셸. 레퍼런스 wakbboolball-3d.html 160~341행의 이식.
// 평면 x·(a−b) ≥ 0 로 구면 다각형을 자른다.
// (원점을 지나는 평면이라 현(chord) 보간 후 정규화하면 대원 교점이 정확히 나온다)

export function clipSphere(poly: Vector3[], nrm: Vector3): Vector3[] {
  const out: Vector3[] = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const fp = p.dot(nrm)
    const fq = q.dot(nrm)
    if (fp >= 0) out.push(p)
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq)
      out.push(new Vector3().lerpVectors(p, q, t).normalize())
    }
  }
  return out
}

export function capPoly(a: Vector3, ang: number, n: number): Vector3[] {
  const ref = Math.abs(a.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0)
  const u = new Vector3().crossVectors(a, ref).normalize()
  const v = new Vector3().crossVectors(a, u).normalize()
  const ca = Math.cos(ang)
  const sa = Math.sin(ang)
  const out: Vector3[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    out.push(
      a
        .clone()
        .multiplyScalar(ca)
        .addScaledVector(u, Math.cos(t) * sa)
        .addScaledVector(v, Math.sin(t) * sa)
        .normalize(),
    )
  }
  return out
}

// 캡 안에서 균일 랜덤 방향 (서브 사이트 샘플링용)
export function randInCap(a: Vector3, ang: number, rng: Rng): Vector3 {
  const ref = Math.abs(a.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0)
  const u = new Vector3().crossVectors(a, ref).normalize()
  const v = new Vector3().crossVectors(a, u).normalize()
  const t = rng() * Math.PI * 2
  const r = Math.acos(1 - rng() * (1 - Math.cos(ang)))
  return a
    .clone()
    .multiplyScalar(Math.cos(r))
    .addScaledVector(u, Math.cos(t) * Math.sin(r))
    .addScaledVector(v, Math.sin(t) * Math.sin(r))
    .normalize()
}

export function voronoiSph(sites: Vector3[], i: number, cap: number): Vector3[] {
  let poly = capPoly(sites[i], cap, 20)
  const a = sites[i]
  for (let j = 0; j < sites.length; j++) {
    if (j === i) continue
    if (a.dot(sites[j]) < Math.cos(cap * 2)) continue // 멀면 건너뜀
    const nrm = a.clone().sub(sites[j]).normalize()
    poly = clipSphere(poly, nrm)
    if (poly.length < 3) break
  }
  return poly
}

export function sphCentroid(poly: Vector3[]): Vector3 {
  const c = new Vector3(0, 0, 0)
  poly.forEach(p => c.add(p))
  return c.lengthSq() < 1e-9 ? poly[0].clone() : c.normalize()
}

export function fibSphere(n: number, jitter: number, rng: Rng): Vector3[] {
  const pts: Vector3[] = []
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = ga * i
    const p = new Vector3(Math.cos(th) * r, y, Math.sin(th) * r)
    p.x += (rng() - 0.5) * jitter
    p.y += (rng() - 0.5) * jitter
    p.z += (rng() - 0.5) * jitter
    pts.push(p.normalize())
  }
  return pts
}

export function buildShell(rng: Rng): WaxShell {
  const groups: WaxGroup[] = []
  const cells: WaxCell[] = []
  const cSites = fibSphere(22, 0.16, rng)
  cSites.forEach((_cs, i) => {
    const cpoly = voronoiSph(cSites, i, 1.15)
    if (cpoly.length < 3) return
    const gc = sphCentroid(cpoly)
    const g: WaxGroup = { cent: gc, c1: 0, c1t: 0, cells: [] }
    groups.push(g)
    // 코어스 셀 안에 서브 사이트 6~9개
    const want = 6 + Math.floor(rng() * 4)
    const sub: Vector3[] = []
    for (let t = 0; t < 500 && sub.length < want; t++) {
      const p = randInCap(gc, 0.7, rng)
      let best = i
      let bd = p.dot(cSites[i])
      for (let j = 0; j < cSites.length; j++) {
        const dd = p.dot(cSites[j])
        if (dd > bd) {
          bd = dd
          best = j
        }
      }
      if (best === i) sub.push(p)
    }
    if (!sub.length) sub.push(gc.clone())
    sub.forEach((_ss, k) => {
      let poly = cpoly
      for (let j = 0; j < sub.length; j++) {
        if (j === k) continue
        poly = clipSphere(poly, sub[k].clone().sub(sub[j]).normalize())
        if (poly.length < 3) break
      }
      if (poly.length < 3) return
      const c = sphCentroid(poly)
      // 면적(입체각) 근사
      let area = 0
      for (let q = 0; q < poly.length; q++) {
        const A = poly[q]
        const B = poly[(q + 1) % poly.length]
        area +=
          Math.abs(
            new Vector3().crossVectors(A.clone().sub(c), B.clone().sub(c)).length(),
          ) * 0.5
      }
      const cell: WaxCell = {
        poly,
        cent: c,
        group: g,
        nv: poly.length,
        area,
        c2: 0,
        c2t: 0,
        wear: 0,
        sink: 0,
        alive: true,
        rot: (rng() - 0.5) * 0.75,
        tone: (rng() - 0.5) * 0.07,
      }
      cells.push(cell)
      g.cells.push(cell)
    })
  })
  let triCount = 0
  cells.forEach(c => {
    triCount += 7 * c.nv
  })
  return { groups, cells, triCount }
}
