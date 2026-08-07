import { useState, useMemo } from 'react'
import type { Page } from '../App'
import { CREW_BALLS } from '../constants/crewBalls'
import './HomePage.css'

interface HomePageProps {
  onNavigate: (page: Page) => void
}

const PAGE_SIZE = 10

const ForkKnifeIcon = () => (
  <svg viewBox="0 0 80 80" fill="none" className="sign-svg">
    <g stroke="#333" strokeLinecap="round" strokeLinejoin="round">
      {/* Fork */}
      <line x1="24" y1="12" x2="24" y2="30" strokeWidth="2.5" />
      <line x1="30" y1="12" x2="30" y2="30" strokeWidth="2.5" />
      <line x1="36" y1="12" x2="36" y2="30" strokeWidth="2.5" />
      <path d="M24 30 Q30 38 36 30" strokeWidth="2.5" fill="none" />
      <line x1="30" y1="36" x2="30" y2="68" strokeWidth="3.5" />
      {/* Knife */}
      <path d="M50 12 L50 68" strokeWidth="3.5" />
      <path d="M50 12 C58 14 58 30 50 34" strokeWidth="2.5" fill="#333" />
    </g>
  </svg>
)

const PeopleIcon = () => (
  <svg viewBox="0 0 80 80" fill="none" className="sign-svg">
    <g stroke="#333" strokeWidth="3" strokeLinecap="round" fill="none">
      {/* Person left */}
      <circle cx="28" cy="18" r="7" />
      <line x1="28" y1="25" x2="28" y2="48" />
      <line x1="28" y1="32" x2="16" y2="42" />
      <line x1="28" y1="32" x2="40" y2="42" />
      <line x1="28" y1="48" x2="20" y2="64" />
      <line x1="28" y1="48" x2="36" y2="64" />
      {/* Person right */}
      <circle cx="54" cy="18" r="7" />
      <line x1="54" y1="25" x2="54" y2="48" />
      <line x1="54" y1="32" x2="42" y2="42" />
      <line x1="54" y1="32" x2="66" y2="42" />
      <line x1="54" y1="48" x2="46" y2="64" />
      <line x1="54" y1="48" x2="62" y2="64" />
    </g>
  </svg>
)

const WakBallIcon = () => (
  <svg viewBox="0 0 80 80" fill="none" className="sign-svg">
    <g stroke="#333" strokeLinecap="round" strokeLinejoin="round">
      {/* Ball */}
      <circle cx="40" cy="40" r="26" strokeWidth="3" fill="#F5C6A0" />
      {/* Cracks */}
      <path d="M32 22 L36 32 L30 38" strokeWidth="2" fill="none" />
      <path d="M48 20 L44 28 L50 34 L46 40" strokeWidth="2" fill="none" />
      <path d="M26 42 L34 44 L38 52" strokeWidth="2" fill="none" />
      <path d="M54 44 L48 48 L50 56" strokeWidth="2" fill="none" />
      {/* Wax chunks flying */}
      <rect x="12" y="10" width="6" height="5" rx="1" fill="#F5C6A0" stroke="#333" strokeWidth="1.5" transform="rotate(-20 15 12)" />
      <rect x="60" y="8" width="7" height="4" rx="1" fill="#F5C6A0" stroke="#333" strokeWidth="1.5" transform="rotate(15 63 10)" />
      <rect x="8" y="50" width="5" height="4" rx="1" fill="#F5C6A0" stroke="#333" strokeWidth="1.5" transform="rotate(-10 10 52)" />
    </g>
  </svg>
)

const RequestIcon = () => (
  <svg viewBox="0 0 80 80" fill="none" className="sign-svg">
    <g stroke="#333" strokeLinecap="round" strokeLinejoin="round">
      {/* Clipboard */}
      <rect x="16" y="14" width="48" height="56" rx="4" strokeWidth="3" fill="#FDE8D8" />
      <rect x="28" y="8" width="24" height="12" rx="3" strokeWidth="2.5" fill="#F5C6A0" />
      {/* Lines */}
      <line x1="26" y1="34" x2="54" y2="34" strokeWidth="2.5" />
      <line x1="26" y1="44" x2="54" y2="44" strokeWidth="2.5" />
      <line x1="26" y1="54" x2="42" y2="54" strokeWidth="2.5" />
      {/* Share arrow */}
      <path d="M50 50 L58 50 L58 62 L50 62" strokeWidth="2" fill="none" />
      <polyline points="54,46 58,50 54,54" strokeWidth="2" fill="none" />
    </g>
  </svg>
)

const SIGNS: {
  key: Page
  label: string
  icon: React.ReactNode
  shape: 'diamond' | 'rect'
}[] = [
  { key: 'wakbbu', label: '왁뿌볼', icon: <WakBallIcon />, shape: 'diamond' },
  { key: 'lunch', label: '점메추 왁뿌볼', icon: <ForkKnifeIcon />, shape: 'rect' },
  { key: 'mingle', label: '밍글 왁뿌볼', icon: <PeopleIcon />, shape: 'rect' },
  { key: 'request', label: '왁뿌볼 요청사항', icon: <RequestIcon />, shape: 'rect' },
]

export const HomePage = ({ onNavigate }: HomePageProps) => {
  const [crewPage, setCrewPage] = useState(0)

  const sorted = useMemo(
    () => [...CREW_BALLS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [],
  )
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice(crewPage * PAGE_SIZE, (crewPage + 1) * PAGE_SIZE)

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1 className="home-title">포트원 완구거리</h1>

        <div className="home-signs">
          {SIGNS.map(s => (
            <button key={s.key} className="home-sign" onClick={() => onNavigate(s.key)}>
              <div className={`sign-board ${s.shape}`}>
                <div className="sign-bolt tl" />
                <div className="sign-bolt tr" />
                {s.icon}
              </div>
              <div className="sign-pole" />
              <div className="sign-name-bar">
                <span className="sign-label">{s.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <section className="crew-section">
        <h2 className="crew-section-title">크루들의 왁뿌볼</h2>
        <div className="crew-grid">
          {paged.map(ball => (
            <div
              key={ball.id}
              className="crew-card"
              onClick={() => {
                const params = new URLSearchParams()
                params.set('items', ball.items.map(encodeURIComponent).join(','))
                params.set('name', ball.name)
                window.history.replaceState(null, '', `?${params.toString()}${window.location.hash}`)
                onNavigate('wakbbu')
              }}
            >
              <div className="crew-card-header">
                <h3>{ball.name}</h3>
                <span className="crew-author">{ball.author}</span>
              </div>
              <div className="crew-items">
                {ball.items.slice(0, 5).map(item => (
                  <span key={item} className="crew-item-chip">{item}</span>
                ))}
                {ball.items.length > 5 && (
                  <span className="crew-item-chip more">+{ball.items.length - 5}</span>
                )}
              </div>
              <p className="crew-date">{new Date(ball.createdAt).toLocaleDateString('ko-KR')}</p>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="crew-pagination">
            <button disabled={crewPage === 0} onClick={() => setCrewPage(p => p - 1)}>&larr; 이전</button>
            <span>{crewPage + 1} / {totalPages}</span>
            <button disabled={crewPage >= totalPages - 1} onClick={() => setCrewPage(p => p + 1)}>다음 &rarr;</button>
          </div>
        )}
      </section>
    </div>
  )
}
