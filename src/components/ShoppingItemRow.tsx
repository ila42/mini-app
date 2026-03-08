import type { ShoppingItem, Category } from '../types'

interface Props {
  item: ShoppingItem
  category: Category | undefined
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function ShoppingItemRow({ item, category, onToggle, onDelete }: Props) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl mb-2"
      style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', opacity: item.purchased ? 0.6 : 1 }}
    >
      <button
        onClick={() => onToggle(item.id)}
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          borderColor: item.purchased ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
          backgroundColor: item.purchased ? 'var(--tg-theme-button-color)' : 'transparent',
        }}
      >
        {item.purchased && <span className="text-white text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="font-medium truncate"
          style={{
            color: 'var(--tg-theme-text-color)',
            textDecoration: item.purchased ? 'line-through' : 'none',
          }}
        >
          {item.name}
        </p>
        {(item.amount || category) && (
          <div className="flex items-center gap-2 mt-0.5">
            {category && (
              <span className="text-xs" style={{ color: category.color }}>
                {category.emoji} {category.name}
              </span>
            )}
            {item.amount && (
              <span className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                ~${item.amount.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="text-xs flex-shrink-0"
        style={{ color: 'var(--tg-theme-hint-color)' }}
      >
        ✕
      </button>
    </div>
  )
}
