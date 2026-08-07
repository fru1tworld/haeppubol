import { useState, useMemo, useRef, useCallback } from 'react'
import type { DiningMode, FoodCategory } from '../types'
import { FOOD_CATEGORY_LABEL, type Restaurant } from '../types'
import { SEONGSU_RESTAURANTS } from '../constants/restaurants'
import { RestaurantDetail } from './RestaurantDetail'
import './BoardPage.css'

const CATEGORY_GRADIENT: Record<FoodCategory, string> = {
  korean: 'linear-gradient(135deg, #fca5a5, #f87171)',
  chinese: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
  japanese: 'linear-gradient(135deg, #93c5fd, #60a5fa)',
  western: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
  asian: 'linear-gradient(135deg, #34d399, #10b981)',
  cafe: 'linear-gradient(135deg, #f9a8d4, #ec4899)',
  snack: 'linear-gradient(135deg, #fdba74, #fb923c)',
  etc: 'linear-gradient(135deg, #94a3b8, #64748b)',
}

const MODE_LABEL: Record<DiningMode | 'all', string> = {
  all: '전체',
  'dine-in': '매장 식사',
  delivery: '배달 시키기',
}

export const BoardPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all'>('all')
  const [selectedMode, setSelectedMode] = useState<DiningMode | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    return SEONGSU_RESTAURANTS.filter(r => {
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false
      if (selectedMode !== 'all' && !r.availableModes.includes(selectedMode)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some(t => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [selectedCategory, selectedMode, searchQuery])

  const handleRandomPick = useCallback(() => {
    const candidates = filtered.filter(r => !r.closed)
    if (candidates.length === 0) return
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    setHighlightedId(pick.id)
    setTimeout(() => {
      document.getElementById(`card-${pick.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }, [filtered])

  if (selectedRestaurant) {
    return (
      <RestaurantDetail
        restaurantId={selectedRestaurant.id}
        onClose={() => setSelectedRestaurant(null)}
      />
    )
  }

  return (
    <div className="board-page">
      <div className="board-filters">
        <div className="category-tabs">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            전체
          </button>
          {(Object.entries(FOOD_CATEGORY_LABEL) as [FoodCategory, string][]).map(([key, label]) => (
            <button
              key={key}
              className={selectedCategory === key ? 'active' : ''}
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="filter-row">
          <div className="mode-tabs">
            {(['all', 'dine-in', 'delivery'] as const).map(m => (
              <button
                key={m}
                className={selectedMode === m ? 'active' : ''}
                onClick={() => setSelectedMode(m)}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="맛집 검색..."
            className="search-input"
          />
        </div>
      </div>

      <div className="card-grid" ref={gridRef}>
        {filtered.map(r => (
          <div
            key={r.id}
            id={`card-${r.id}`}
            className={`restaurant-card ${r.closed ? 'closed' : ''} ${highlightedId === r.id ? 'highlighted' : ''}`}
            onClick={() => !r.closed && setSelectedRestaurant(r)}
          >
            <div
              className="card-image"
              style={{ background: CATEGORY_GRADIENT[r.category] }}
            >
              {r.closed && <span className="closed-badge">폐업</span>}
            </div>
            <div className="card-body">
              <div className="card-title-row">
                <h3>{r.name}</h3>
                <span className="category-badge">{FOOD_CATEGORY_LABEL[r.category]}</span>
              </div>
              <p className="card-desc">{r.description}</p>
              {r.phone && <p className="card-info">{r.phone}</p>}
              {r.hours && <p className="card-info">{r.hours}</p>}
              <div className="card-tags">
                {r.tags.map(t => (
                  <span key={t} className="card-tag">{t}</span>
                ))}
              </div>
              <div className="card-footer">
                <span>{r.priceRange}</span>
                <span>{r.distanceFromStation}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="no-results">검색 결과가 없습니다</p>
      )}

      <button className="fab-random" onClick={handleRandomPick}>
        랜덤 뽑기
      </button>
    </div>
  )
}
