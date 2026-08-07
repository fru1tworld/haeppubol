import { motion } from 'framer-motion'
import type { SmashResult } from '../types'
import { FOOD_CATEGORY_LABEL } from '../types'
import './ResultCard.css'

const CATEGORY_COLORS: Record<string, string> = {
  korean: '#ef4444',
  chinese: '#f97316',
  japanese: '#3b82f6',
  western: '#8b5cf6',
  asian: '#10b981',
  cafe: '#ec4899',
  snack: '#f59e0b',
  etc: '#6b7280',
}

export const ResultCard = ({
  result,
  onRetry,
}: {
  result: SmashResult | null
  onRetry: () => void
}) => {
  if (!result) return null

  const { restaurant, mode } = result
  const mapLink =
    restaurant.mapUrl ??
    `https://map.kakao.com/?q=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`

  return (
    <motion.div
      className="result-card"
      initial={{ scale: 0.1, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {restaurant.closed && (
        <div className="result-closed-banner">폐업된 가게입니다</div>
      )}

      <div className="result-header">
        <h2 className="result-name">{restaurant.name}</h2>
        <span
          className="result-category"
          style={{ background: CATEGORY_COLORS[restaurant.category] ?? '#6b7280' }}
        >
          {FOOD_CATEGORY_LABEL[restaurant.category]}
        </span>
      </div>

      <p className="result-description">{restaurant.description}</p>

      <div className="result-info">
        <span>{restaurant.address} · {restaurant.distanceFromStation}</span>
        <span>{restaurant.priceRange}</span>
      </div>

      {restaurant.phone && (
        <div className="result-detail">전화 {restaurant.phone}</div>
      )}
      {restaurant.hours && (
        <div className="result-detail">영업 {restaurant.hours}</div>
      )}
      {restaurant.note && (
        <div className="result-detail result-note">{restaurant.note}</div>
      )}

      {restaurant.tags.length > 0 && (
        <div className="result-tags">
          {restaurant.tags.map(tag => (
            <span key={tag} className="result-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="result-actions">
        {mode === 'dine-in' && (
          <a href={mapLink} target="_blank" rel="noopener noreferrer" className="result-btn primary">
            지도 보기
          </a>
        )}
        <button className="result-btn retry" onClick={onRetry}>
          다시 뿌수기
        </button>
      </div>
    </motion.div>
  )
}
