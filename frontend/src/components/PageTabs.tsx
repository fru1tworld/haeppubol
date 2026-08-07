import './PageTabs.css'

interface Tab {
  label: string
  active?: boolean
  onClick: () => void
}

export const PageTabs = ({ tabs }: { tabs: Tab[] }) => (
  <header className="page-tabs">
    {tabs.map(tab => (
      <button
        key={tab.label}
        className={`page-tab${tab.active ? ' active' : ''}`}
        onClick={tab.onClick}
      >
        {tab.label}
      </button>
    ))}
  </header>
)
