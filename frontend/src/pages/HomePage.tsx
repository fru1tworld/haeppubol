import { MENUS } from '../App'
import type { Page } from '../App'
import './HomePage.css'

interface HomePageProps {
  onNavigate: (page: Page) => void
}

export const HomePage = ({ onNavigate }: HomePageProps) => (
  <div className="home-page">
    <div className="home-hero">
      <h1>이삭토스트 놀이터</h1>
      <p>왁뿌볼부터 점메추까지, 크루들의 소소한 즐거움</p>
    </div>

    <div className="home-menu-grid">
      {MENUS.map(m => (
        <button key={m.key} className="home-menu-card" onClick={() => onNavigate(m.key)}>
          <h3>{m.label}</h3>
          <p>{m.description}</p>
        </button>
      ))}
    </div>
  </div>
)
