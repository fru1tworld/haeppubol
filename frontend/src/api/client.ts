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
    list: () => fetchJson<Restaurant[]>('/api/restaurants'),
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
    remove: (id: string, password: string) =>
      fetchJson<void>(`/api/restaurants/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }),
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
    remove: (name: string) =>
      fetchJson<void>(`/api/mingle-teams/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  },
  crewBalls: {
    list: () =>
      fetchJson<Array<{
        id: string
        name: string
        author: string
        items: string[]
        shellColor: string | null
        coreColor: string | null
        tagline: string | null
        photo: string | null
        background: string | null
        sound: string | null
        healMode: boolean
        createdAt: string
      }>>('/api/crew-balls'),
    create: (data: {
      name: string
      author: string
      items?: string[]
      shellColor?: string
      coreColor?: string
      tagline?: string
      photo?: string
      background?: string
      sound?: string
      healMode?: boolean
    }) =>
      fetchJson<{
        id: string
        name: string
        author: string
        items: string[]
        shellColor: string | null
        coreColor: string | null
        tagline: string | null
        photo: string | null
        background: string | null
        sound: string | null
        healMode: boolean
        createdAt: string
      }>('/api/crew-balls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      fetchJson<void>(`/api/crew-balls/${encodeURIComponent(id)}`, { method: 'DELETE' }),
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
