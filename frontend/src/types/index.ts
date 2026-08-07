export type DiningMode = 'dine-in' | 'delivery'

export type FoodCategory =
  | 'korean'
  | 'chinese'
  | 'japanese'
  | 'western'
  | 'asian'
  | 'cafe'
  | 'snack'
  | 'etc'

export const FOOD_CATEGORY_LABEL: Record<FoodCategory, string> = {
  korean: '한식',
  chinese: '중식',
  japanese: '일식',
  western: '양식',
  asian: '아시안',
  cafe: '카페/디저트',
  snack: '분식',
  etc: '기타',
} as const

export interface Restaurant {
  readonly id: string
  readonly name: string
  readonly category: FoodCategory
  readonly description: string
  readonly address: string
  readonly phone?: string
  readonly hours?: string
  readonly note?: string
  readonly closed?: boolean
  readonly distanceFromStation: string
  readonly priceRange: string
  readonly availableModes: readonly DiningMode[]
  readonly tags: readonly string[]
  readonly imageUrl?: string
  readonly mapUrl?: string
  readonly deliveryApps?: readonly string[]
}

export interface SmashResult {
  readonly restaurant: Restaurant
  readonly mode: DiningMode
  readonly smashedAt: number
}

export interface Review {
  readonly id: string
  readonly restaurantId: string
  readonly nickname: string
  readonly content: string
  readonly rating: number
  readonly createdAt: string
}
