import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import {
  addDent,
  createDeformState,
  deformClay,
  deformSmooth,
  fall,
  fieldOf,
  ridged,
  strainAt,
  updateBulge,
  vnoise,
} from './deformField'

// 피보나치 구면 — 서로 충분히 떨어진(dot < 0.982) 방향 목록
function fibDirs(n: number): Vector3[] {
  const out: Vector3[] = []
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = ga * i
    out.push(new Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize())
  }
  return out
}

describe('noise', () => {
  it('is deterministic: same input, same output', () => {
    expect(vnoise(1.3, -2.7, 0.5)).toBe(vnoise(1.3, -2.7, 0.5))
    expect(ridged(0.2, 4.1, -3.3)).toBe(ridged(0.2, 4.1, -3.3))
  })

  it('stays in [0, 1]', () => {
    for (let i = 0; i < 200; i++) {
      const v = vnoise(i * 0.371, i * -0.713, i * 1.117)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
      const r = ridged(i * 0.371, i * -0.713, i * 1.117)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(1)
    }
  })
})

describe('fall', () => {
  const cosr = Math.cos(0.4)
  const invr = 1 / (1 - cosr)

  it('is 0 outside the cap and at the boundary', () => {
    expect(fall(cosr - 0.01, cosr, invr)).toBe(0)
    expect(fall(cosr, cosr, invr)).toBe(0)
  })

  it('is 1 at the center and smoothstep in between', () => {
    expect(fall(1, cosr, invr)).toBeCloseTo(1, 12)
    const mid = fall(cosr + (1 - cosr) * 0.5, cosr, invr)
    expect(mid).toBeCloseTo(0.5, 12) // t=0.5 -> 0.25*(3-1)=0.5
  })
})

describe('addDent', () => {
  it('merges nearby dents (dot > 0.982): count stays, depth capped at 0.22', () => {
    const st = createDeformState()
    const dir = new Vector3(0, 1, 0)
    addDent(st, dir, 0.1, 0.35)
    for (let i = 0; i < 10; i++) addDent(st, dir.clone(), 0.1, 0.35)
    expect(st.dents.length).toBe(1)
    expect(st.dents[0].depth).toBe(0.22)
  })

  it('caps a fresh dent depth at 0.20', () => {
    const st = createDeformState()
    addDent(st, new Vector3(1, 0, 0), 0.5, 0.35)
    expect(st.dents[0].depth).toBe(0.20)
  })

  it('keeps at most 20 dents, dropping the oldest', () => {
    const st = createDeformState()
    const dirs = fibDirs(25)
    for (const d of dirs) addDent(st, d, 0.05, 0.3)
    expect(st.dents.length).toBe(20)
    // 남은 것은 마지막 20개 방향
    expect(st.dents[0].dir.dot(dirs[5])).toBeCloseTo(1, 12)
    expect(st.dents[19].dir.dot(dirs[24])).toBeCloseTo(1, 12)
  })

  it('accumulates plasticTotal monotonically, never recovering', () => {
    const st = createDeformState()
    const dirs = fibDirs(30)
    let prev = st.plasticTotal
    expect(prev).toBe(0)
    for (let i = 0; i < 30; i++) {
      // 병합(같은 방향 반복)과 신규(다른 방향)를 섞어도 항상 증가
      addDent(st, dirs[i % 2 === 0 ? 0 : i], 0.08, 0.3)
      expect(st.plasticTotal).toBeGreaterThan(prev)
      prev = st.plasticTotal
    }
    // depth가 상한(0.22)에 막혀도 plasticTotal은 계속 쌓인다
    const before = st.plasticTotal
    addDent(st, dirs[0], 0.08, 0.3)
    expect(st.dents.find(d => d.dir.dot(dirs[0]) > 0.982)?.depth).toBe(0.22)
    expect(st.plasticTotal).toBeGreaterThan(before)
  })
})

describe('deformSmooth / strainAt', () => {
  it('contributes 0 outside the dent cap', () => {
    const st = createDeformState()
    addDent(st, new Vector3(0, 1, 0), 0.1, 0.3)
    const opposite = new Vector3(0, -1, 0)
    expect(deformSmooth(st, opposite)).toBe(0) // bulge 0, squeeze 0
    expect(strainAt(st, opposite)).toBe(0)
  })

  it('is depth-deep at the dent center', () => {
    const st = createDeformState()
    addDent(st, new Vector3(0, 1, 0), 0.1, 0.3)
    expect(deformSmooth(st, new Vector3(0, 1, 0))).toBeCloseTo(-0.1, 12)
    expect(strainAt(st, new Vector3(0, 1, 0))).toBeCloseTo(0.1, 12)
  })

  it('applies squeeze elastically and bulge with near damping', () => {
    const st = createDeformState()
    st.squeeze.depth = 0.1
    expect(deformSmooth(st, new Vector3(0, 1, 0))).toBeCloseTo(-0.1, 12)
    st.bulge = 0.05
    // squeeze 중심: near=1 -> bulge*(1-0.92)
    expect(deformSmooth(st, new Vector3(0, 1, 0))).toBeCloseTo(-0.1 + 0.05 * 0.08, 12)
    // squeeze 캡 밖: 팽창만
    expect(deformSmooth(st, new Vector3(0, -1, 0))).toBeCloseTo(0.05, 12)
  })
})

describe('deformClay', () => {
  it('equals deformSmooth where there is no strain', () => {
    const st = createDeformState()
    st.squeeze.depth = 0.1 // squeeze는 strain에 안 들어간다
    st.bulge = 0.03
    const d = new Vector3(0.3, 0.8, 0.2).normalize()
    expect(deformClay(st, d)).toBe(deformSmooth(st, d))
  })

  it('adds ridged wrinkles where strained, deterministically', () => {
    const st = createDeformState()
    addDent(st, new Vector3(0, 1, 0), 0.1, 0.4)
    const d = new Vector3(0.1, 0.95, 0.05).normalize()
    const a = deformClay(st, d)
    expect(a).not.toBe(deformSmooth(st, d))
    // 같은 입력 -> 같은 출력
    const st2 = createDeformState()
    addDent(st2, new Vector3(0, 1, 0), 0.1, 0.4)
    expect(deformClay(st2, d)).toBe(a)
  })
})

describe('updateBulge', () => {
  it('is proportional to pressed volume with factor 0.42', () => {
    const st = createDeformState()
    addDent(st, new Vector3(0, 1, 0), 0.1, 0.3)
    st.squeeze.depth = 0.05
    updateBulge(st)
    const expected =
      (0.1 * (1 - Math.cos(0.3)) + 0.05 * (1 - st.squeeze.cosr)) * 0.42
    expect(st.bulge).toBeCloseTo(expected, 12)
  })

  it('grows with deeper dents', () => {
    const shallow = createDeformState()
    addDent(shallow, new Vector3(0, 1, 0), 0.05, 0.3)
    updateBulge(shallow)
    const deep = createDeformState()
    addDent(deep, new Vector3(0, 1, 0), 0.15, 0.3)
    updateBulge(deep)
    expect(deep.bulge).toBeGreaterThan(shallow.bulge)
    expect(deep.bulge / shallow.bulge).toBeCloseTo(3, 12)
  })
})

describe('fieldOf', () => {
  it('mirrors the underlying state, including later mutations', () => {
    const st = createDeformState()
    const field = fieldOf(st)
    const d = new Vector3(0.2, 0.9, 0.1).normalize()
    expect(field.smooth(d)).toBe(deformSmooth(st, d))
    expect(field.clay(d)).toBe(deformClay(st, d))
    expect(field.strain(d)).toBe(strainAt(st, d))
    addDent(st, new Vector3(0, 1, 0), 0.1, 0.4)
    updateBulge(st)
    expect(field.smooth(d)).toBe(deformSmooth(st, d))
    expect(field.clay(d)).toBe(deformClay(st, d))
    expect(field.strain(d)).toBe(strainAt(st, d))
  })
})

describe('determinism', () => {
  it('same operation sequence yields identical state and field values', () => {
    const run = () => {
      const st = createDeformState()
      const dirs = fibDirs(8)
      for (const d of dirs) addDent(st, d, 0.07, 0.35)
      st.squeeze.depth = 0.06
      updateBulge(st)
      const probe = new Vector3(0.4, 0.5, -0.7).normalize()
      return {
        plasticTotal: st.plasticTotal,
        bulge: st.bulge,
        smooth: deformSmooth(st, probe),
        clay: deformClay(st, probe),
        strain: strainAt(st, probe),
      }
    }
    expect(run()).toEqual(run())
  })
})
