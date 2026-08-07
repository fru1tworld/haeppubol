import { useState, useEffect } from 'react'
import { MainPage } from './pages/MainPage'
import { MinglePage } from './pages/MinglePage'
import { CustomPage } from './pages/CustomPage'
import { RequestPage } from './pages/RequestPage'
import { HomePage } from './pages/HomePage'

export type Page = 'home' | 'wakbbu' | 'lunch' | 'mingle' | 'request'

export const MENUS: readonly { key: Page; label: string; description: string }[] = [
  { key: 'wakbbu', label: '수제 왁뿌볼', description: '왁뿌볼을 뿌셔서 스트레스 해소!' },
  { key: 'lunch', label: '점메추 왁뿌볼', description: '오늘 점심 메뉴 추천받기' },
  { key: 'mingle', label: '밍글 왁뿌볼', description: '밍글 조 랜덤 추첨' },
  { key: 'request', label: '왁뿌볼 요청사항', description: '공유 링크를 만들어 요청하기' },
] as const

const parseHash = (): Page => {
  const hash = window.location.hash.slice(2)
  return MENUS.some(m => m.key === hash) ? (hash as Page) : 'home'
}

export const App = () => {
  const [page, setPage] = useState<Page>(parseHash)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const onHashChange = () => setPage(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (target: Page) => {
    window.location.hash = target === 'home' ? '/' : `/${target}`
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="app-logo" onClick={() => navigate('home')}>
          포트원 완구거리
        </button>
      </header>

      <div className="app-body">
        <aside className={`app-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label={sidebarOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          {sidebarOpen && MENUS.map(m => (
            <button
              key={m.key}
              className={page === m.key ? 'active' : ''}
              onClick={() => navigate(m.key)}
              title={m.label}
            >
              <span className="sidebar-label">{m.label}</span>
            </button>
          ))}
        </aside>

        <main className="app-content">
          {page === 'home' && <HomePage onNavigate={navigate} />}
          {page === 'wakbbu' && <CustomPage />}
          {page === 'lunch' && <MainPage />}
          {page === 'mingle' && <MinglePage />}
          {page === 'request' && <RequestPage />}
        </main>
      </div>
    </div>
  )
}
