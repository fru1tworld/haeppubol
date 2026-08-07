import { useState, useMemo } from 'react'
import type { Review } from '../types'
import { FOOD_CATEGORY_LABEL } from '../types'
import { SEONGSU_RESTAURANTS } from '../constants/restaurants'
import './RestaurantDetail.css'

interface Props {
  restaurantId: string
  onClose: () => void
}

export const RestaurantDetail = ({ restaurantId, onClose }: Props) => {
  const restaurant = useMemo(
    () => SEONGSU_RESTAURANTS.find(r => r.id === restaurantId),
    [restaurantId],
  )

  const [reviews, setReviews] = useState<Review[]>([])
  const [nickname, setNickname] = useState('')
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')

  if (!restaurant) {
    return (
      <div className="detail-page">
        <button className="btn-close" onClick={onClose}>&larr; 돌아가기</button>
        <p>맛집을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const submitReview = () => {
    if (!nickname.trim() || !content.trim()) return
    const review: Review = {
      id: `review-${Date.now()}`,
      restaurantId: restaurant.id,
      nickname: nickname.trim(),
      content: content.trim(),
      rating,
      createdAt: new Date().toISOString(),
    }
    setReviews(prev => [review, ...prev])
    setNickname('')
    setContent('')
    setRating(5)
  }

  return (
    <div className="detail-page">
      <button className="btn-close" onClick={onClose}>&larr; 돌아가기</button>

      <div className="detail-content">
        <div className="detail-header">
          <h1>{restaurant.name}</h1>
          <span className="detail-category">{FOOD_CATEGORY_LABEL[restaurant.category]}</span>
          {restaurant.closed && <span className="detail-closed">폐업</span>}
        </div>

        <p className="detail-desc">{restaurant.description}</p>

        <div className="detail-info-grid">
          <div className="info-item">
            <span className="info-label">주소</span>
            <span>{restaurant.address}</span>
          </div>
          {restaurant.phone && (
            <div className="info-item">
              <span className="info-label">전화</span>
              <span>{restaurant.phone}</span>
            </div>
          )}
          {restaurant.hours && (
            <div className="info-item">
              <span className="info-label">영업시간</span>
              <span>{restaurant.hours}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">거리</span>
            <span>{restaurant.distanceFromStation}</span>
          </div>
          <div className="info-item">
            <span className="info-label">가격대</span>
            <span>{restaurant.priceRange}</span>
          </div>
          {restaurant.note && (
            <div className="info-item">
              <span className="info-label">참고</span>
              <span>{restaurant.note}</span>
            </div>
          )}
        </div>

        <div className="detail-tags">
          {restaurant.tags.map(t => (
            <span key={t} className="detail-tag">{t}</span>
          ))}
        </div>

        <div className="detail-actions">
          {restaurant.mapUrl && (
            <a href={restaurant.mapUrl} target="_blank" rel="noreferrer" className="btn-action">
              지도 보기
            </a>
          )}
          {restaurant.deliveryApps?.map(app => (
            <span key={app} className="btn-action delivery">{app}</span>
          ))}
        </div>

        <div className="review-section">
          <h2>리뷰</h2>

          <div className="review-form">
            <div className="review-form-row">
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="닉네임"
                className="review-input"
              />
              <select
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                className="review-select"
              >
                {[5, 4, 3, 2, 1].map(n => (
                  <option key={n} value={n}>{'★'.repeat(n)}</option>
                ))}
              </select>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="리뷰를 작성하세요"
              className="review-textarea"
              rows={3}
            />
            <button className="btn-submit-review" onClick={submitReview}>등록</button>
          </div>

          {reviews.length === 0 && (
            <p className="no-reviews">아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!</p>
          )}

          {reviews.map(review => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <span className="review-nickname">{review.nickname}</span>
                <span className="review-rating">{'★'.repeat(review.rating)}</span>
                <span className="review-date">
                  {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <p className="review-content">{review.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
