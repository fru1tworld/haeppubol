import { useState, useEffect } from 'react'
import { MainPage } from './pages/MainPage'
import { MinglePage } from './pages/MinglePage'
import { CustomPage } from './pages/CustomPage'
import { BoardPage } from './pages/BoardPage'
import { SmashPage } from './pages/SmashPage'

type Page = 'custom' | 'play' | 'lunch' | 'mingle' | 'board'

const PAGES: readonly { key: Page; label: string }[] = [
  { key: 'play', label: '왁뿌볼' },
  { key: 'custom', label: '왁뿌볼 게시판' },
  { key: 'lunch', label: '점메추' },
  { key: 'mingle', label: '밍글추첨' },
  { key: 'board', label: '맛집 게시판' },
] as const

const parseHash = (): Page => {
  const hash = window.location.hash.slice(2)
  return PAGES.some(p => p.key === hash) ? (hash as Page) : 'custom'
}

export const App = () => {
  const [page, setPage] = useState<Page>(parseHash)

  useEffect(() => {
    const onHashChange = () => setPage(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (target: Page) => {
    window.location.hash = `/${target}`
  }

  return (
    <div className="app">
      <nav className="app-nav">
        {PAGES.map(p => (
          <button
            key={p.key}
            className={page === p.key ? 'active' : ''}
            onClick={() => navigate(p.key)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <main className="app-content">
        {page === 'custom' && <CustomPage />}
        {page === 'play' && <SmashPage />}
        {page === 'lunch' && <MainPage />}
        {page === 'mingle' && <MinglePage />}
        {page === 'board' && <BoardPage />}
      </main>
    </div>
  )
}
