import type { Restaurant, Review, DiningMode, FoodCategory } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

interface FetchOptions {
  method?: string
  body?: unknown
  params?: Record<string, string | undefined>
}

const fetchJson = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, v)
    })
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

interface CreateRestaurantRequest {
  name: string
  category: FoodCategory
  description: string
  address: string
  phone?: string
  hours?: string
  note?: string
  distanceFromStation: string
  priceRange: string
  availableModes: DiningMode[]
  tags: string[]
  imageUrl?: string
  mapUrl?: string
  deliveryApps?: string[]
}

type UpdateRestaurantRequest = Partial<CreateRestaurantRequest>

interface CreateReviewRequest {
  nickname: string
  content: string
  rating: number
}

interface SmashLogRequest {
  restaurantId: string
  mode: DiningMode
}

interface SmashStats {
  totalSmashes: number
  topRestaurants: Array<{ restaurantId: string; name: string; count: number }>
}

export const api = {
  restaurants: {
    list: (params?: { category?: string; mode?: string; search?: string }) =>
      fetchJson<Restaurant[]>('/api/restaurants', { params }),
    get: (id: string) =>
      fetchJson<Restaurant>(`/api/restaurants/${id}`),
    random: (mode: DiningMode, category?: string) =>
      fetchJson<Restaurant>('/api/restaurants/random', { params: { mode, category } }),
    create: (data: CreateRestaurantRequest) =>
      fetchJson<Restaurant>('/api/restaurants', { method: 'POST', body: data }),
    update: (id: string, data: UpdateRestaurantRequest) =>
      fetchJson<Restaurant>(`/api/restaurants/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) =>
      fetchJson<void>(`/api/restaurants/${id}`, { method: 'DELETE' }),
  },
  reviews: {
    list: (restaurantId: string) =>
      fetchJson<Review[]>(`/api/restaurants/${restaurantId}/reviews`),
    create: (restaurantId: string, data: CreateReviewRequest) =>
      fetchJson<Review>(`/api/restaurants/${restaurantId}/reviews`, { method: 'POST', body: data }),
  },
  smashLogs: {
    log: (data: SmashLogRequest) =>
      fetchJson<void>('/api/smash-logs', { method: 'POST', body: data }),
    stats: () =>
      fetchJson<SmashStats>('/api/smash-logs/stats'),
  },
} as const
