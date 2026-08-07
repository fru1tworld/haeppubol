import type { Restaurant, DiningMode } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function fetchJson<T = void>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return undefined as unknown as T
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
  mingleTeams: {
    list: () =>
      fetchJson<{ teams: string[] }>('/api/mingle-teams').then(r => r.teams),
    add: (name: string) =>
      fetchJson<void>('/api/mingle-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
    replace: (teams: string[]) =>
      fetchJson<{ teams: string[] }>('/api/mingle-teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams }),
      }).then(r => r.teams),
    remove: (name: string) =>
      fetchJson<void>(`/api/mingle-teams/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  },
  share: {
    lunch: (data: {
      name: string
      category: string
      mode: string
      address: string
      distanceFromStation: string
      priceRange: string
      mapUrl?: string
    }) =>
      fetchJson<void>('/api/share/lunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    mingle: (data: { winner: string; teams: string[] }) =>
      fetchJson<void>('/api/share/mingle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    custom: (data: { ballName: string; result: string; items: string[] }) =>
      fetchJson<void>('/api/share/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
} as const
