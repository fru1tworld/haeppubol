import { describe, expect, it } from 'vitest'
import {
  CORE_COLORS,
  DEFAULT_SHELL_COLOR,
  SHELL_COLORS,
  isHexColor,
  waxPalette,
} from './ballColors'
import { DEFAULT_WAX_PALETTE } from './waxGeometry'

describe('isHexColor', () => {
  it('6자리 헥사만 통과시킨다', () => {
    expect(isHexColor('#ffffff')).toBe(true)
    expect(isHexColor('#A1b2C3')).toBe(true)
    expect(isHexColor('#fff')).toBe(false)
    expect(isHexColor('ffffff')).toBe(false)
    expect(isHexColor('javascript:alert(1)')).toBe(false)
  })
})

describe('waxPalette', () => {
  it('기본 겉면색은 원래 왁스 톤과 사실상 같다', () => {
    const p = waxPalette(DEFAULT_SHELL_COLOR)
    DEFAULT_WAX_PALETTE.base.forEach((v, i) => {
      expect(p.base[i]).toBeCloseTo(v, 1)
    })
  })

  it('단면(deep)은 겉면보다 어둡다', () => {
    const p = waxPalette('#4f9e5f')
    p.deep.forEach((v, i) => {
      expect(v).toBeLessThan(p.base[i])
      expect(v).toBeGreaterThanOrEqual(0)
    })
  })

  it('잘못된 값은 기본색으로 되돌린다', () => {
    expect(waxPalette('nope')).toEqual(waxPalette(DEFAULT_SHELL_COLOR))
  })

  it('모든 프리셋은 유효한 헥사다', () => {
    for (const o of [...SHELL_COLORS, ...CORE_COLORS]) {
      expect(isHexColor(o.hex)).toBe(true)
    }
  })
})
