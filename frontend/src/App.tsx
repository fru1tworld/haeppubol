import { useState, useEffect } from 'react'
import { MainPage } from './pages/MainPage'
import { MinglePage } from './pages/MinglePage'
import { CustomPage } from './pages/CustomPage'
import { BoardPage } from './pages/BoardPage'
import { SmashPage } from './pages/SmashPage'
import { HomePage } from './pages/HomePage'

export type Page = 'home' | 'custom' | 'play' | 'lunch' | 'mingle' | 'board'

export const MENUS: readonly { key: Page; label: string; description: string }[] = [
  { key: 'play', label: '왁뿌볼', description: '공을 뿌셔서 스트레스 해소!' },
  { key: 'custom', label: '왁뿌볼 게시판', description: '나만의 왁뿌볼을 만들고 공유하기' },
  { key: 'lunch', label: '점메추', description: '오늘 점심 메뉴 추천받기' },
  { key: 'mingle', label: '밍글 추첨', description: '밍글 조 랜덤 추첨' },
  { key: 'board', label: '맛집 게시판', description: '성수 맛집 정보 모음' },
] as const

const parseHash = (): Page => {
  const hash = window.location.hash.slice(2)
  return MENUS.some(m => m.key === hash) ? (hash as Page) : 'home'
}

export const App = () => {
  const [page, setPage] = useState<Page>(parseHash)

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
          이삭토스트
        </button>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          {MENUS.map(m => (
            <button
              key={m.key}
              className={page === m.key ? 'active' : ''}
              onClick={() => navigate(m.key)}
            >
              {m.label}
            </button>
          ))}
        </aside>

        <main className="app-content">
          {page === 'home' && <HomePage onNavigate={navigate} />}
          {page === 'custom' && <CustomPage />}
          {page === 'play' && <SmashPage />}
          {page === 'lunch' && <MainPage />}
          {page === 'mingle' && <MinglePage />}
          {page === 'board' && <BoardPage />}
        </main>
      </div>
    </div>
  )
}
