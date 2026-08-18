import './PageTabs.css'

interface Tab {
  label: string
  active?: boolean
  onClick: () => void
}

export const PageTabs = ({ tabs }: { tabs: Tab[] }) => (
  <div className="page-tabs">
    {tabs.map(tab => (
      <button
        key={tab.label}
        className={`page-tab${tab.active ? ' active' : ''}`}
        aria-pressed={!!tab.active}
        onClick={tab.onClick}
      >
        {tab.label}
      </button>
    ))}
  </div>
)
