import type { Tab } from '../types'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'expenses', label: 'Расходы', icon: '💸' },
  { id: 'shopping', label: 'Покупки', icon: '🛒' },
  { id: 'categories', label: 'Категории', icon: '🏷️' },
  { id: 'stats', label: 'Статистика', icon: '📊' },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t" style={{
      backgroundColor: 'var(--tg-theme-bg-color)',
      borderColor: 'var(--tg-theme-hint-color)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="flex-1 flex flex-col items-center py-2 gap-1 text-xs transition-opacity"
          style={{
            color: active === tab.id ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
            opacity: active === tab.id ? 1 : 0.7,
          }}
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span className="font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
