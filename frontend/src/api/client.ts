import type { Restaurant, DiningMode } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  restaurants: {
    list: (params?: { category?: string; mode?: string; search?: string }) => {
      const qs = new URLSearchParams()
      if (params?.category) qs.set('category', params.category)
      if (params?.mode) qs.set('mode', params.mode)
      if (params?.search) qs.set('search', params.search)
      const q = qs.toString()
      return fetchJson<Restaurant[]>(`/api/restaurants${q ? `?${q}` : ''}`)
    },
    random: (mode: DiningMode, category?: string) => {
      const qs = new URLSearchParams({ mode })
      if (category) qs.set('category', category)
      return fetchJson<Restaurant>(`/api/restaurants/random?${qs}`)
    },
    create: (data: Omit<Restaurant, 'id' | 'createdAt'> & { password: string }) =>
      fetchJson<Restaurant>('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
  smashLogs: {
    log: (restaurantId: string, mode: DiningMode) =>
      fetchJson<void>('/api/smash-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, mode }),
      }),
    stats: () =>
      fetchJson<{ totalSmashes: number; topRestaurants: Array<{ restaurantId: string; name: string; count: number }> }>(
        '/api/smash-logs/stats',
      ),
  },
} as const
