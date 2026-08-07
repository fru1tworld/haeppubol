import { describe, it, expect } from 'vitest'
import { SEONGSU_RESTAURANTS } from './restaurants'
import { FOOD_CATEGORY_LABEL } from '../types'

describe('SEONGSU_RESTAURANTS', () => {
  it('27개 맛집이 등록되어 있다', () => {
    expect(SEONGSU_RESTAURANTS).toHaveLength(27)
  })

  it('id가 중복되지 않는다', () => {
    const ids = SEONGSU_RESTAURANTS.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 카테고리가 라벨 매핑에 존재한다', () => {
    for (const r of SEONGSU_RESTAURANTS) {
      expect(FOOD_CATEGORY_LABEL[r.category]).toBeDefined()
    }
  })

  it('availableModes는 비어있지 않다', () => {
    for (const r of SEONGSU_RESTAURANTS) {
      expect(r.availableModes.length).toBeGreaterThan(0)
    }
  })

  it('직접방문 모드에서 폐업 제외 후보가 존재한다', () => {
    const dineIn = SEONGSU_RESTAURANTS.filter(
      r => !r.closed && r.availableModes.includes('dine-in'),
    )
    expect(dineIn.length).toBeGreaterThan(0)
  })

  it('배달 모드에서 폐업 제외 후보가 존재한다', () => {
    const delivery = SEONGSU_RESTAURANTS.filter(
      r => !r.closed && r.availableModes.includes('delivery'),
    )
    expect(delivery.length).toBeGreaterThan(0)
  })
})
