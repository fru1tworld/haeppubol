import { Color } from 'three'
import type { WaxPalette } from './waxGeometry'

// 왁뿌볼 색 커스텀. 겉면(왁스 셸)과 속(클레이)을 따로 고른다.

export interface BallColorOption {
  id: string
  label: string
  hex: string
}

/** 겉면 = 왁스 셸. 정점 색으로 구워진다 */
export const SHELL_COLORS: readonly BallColorOption[] = [
  { id: 'cream', label: '크림', hex: '#fbf8f1' },
  { id: 'peach', label: '피치', hex: '#fbdcc2' },
  { id: 'mint', label: '민트', hex: '#c8ebdc' },
  { id: 'sky', label: '하늘', hex: '#cadcf7' },
  { id: 'lilac', label: '라일락', hex: '#ddcef3' },
  { id: 'charcoal', label: '차콜', hex: '#8f8a97' },
] as const

/** 속 = 클레이. 겉면이 깨지면 드러난다 */
export const CORE_COLORS: readonly BallColorOption[] = [
  { id: 'strawberry', label: '딸기', hex: '#e0405c' },
  { id: 'mango', label: '망고', hex: '#f0993a' },
  { id: 'matcha', label: '말차', hex: '#4f9e5f' },
  { id: 'ocean', label: '오션', hex: '#2f7fc4' },
  { id: 'grape', label: '포도', hex: '#7c4dbd' },
  { id: 'cocoa', label: '코코아', hex: '#6b4630' },
] as const

export const DEFAULT_SHELL_COLOR = SHELL_COLORS[0].hex
export const DEFAULT_CORE_COLOR = CORE_COLORS[0].hex

export const isHexColor = (v: string): boolean => /^#[0-9a-fA-F]{6}$/.test(v)

/** 깨진 단면은 겉면보다 어둡고 따뜻하게 — 원본 왁스 톤의 채널비 */
const DEEP_RATIO: readonly [number, number, number] = [0.54, 0.5, 0.45]

const _c = new Color()

/** sRGB 헥사 → 정점 색 버퍼가 쓰는 선형 팔레트 */
export const waxPalette = (hex: string): WaxPalette => {
  _c.set(isHexColor(hex) ? hex : DEFAULT_SHELL_COLOR)
  const base: [number, number, number] = [_c.r, _c.g, _c.b]
  return {
    base,
    deep: [base[0] * DEEP_RATIO[0], base[1] * DEEP_RATIO[1], base[2] * DEEP_RATIO[2]],
  }
}
