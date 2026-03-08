import type { Expense, Category } from '../types'
import CategoryBadge from './CategoryBadge'

interface Props {
  expense: Expense
  category: Category | undefined
  onDelete: (id: string) => void
}

export default function ExpenseCard({ expense, category, onDelete }: Props) {
  const date = new Date(expense.date).toLocaleDateString('ru-RU', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl mb-2"
      style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
    >
      <div className="text-2xl">{category?.emoji ?? '📦'}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: 'var(--tg-theme-text-color)' }}>
          {expense.description || category?.name || 'Расход'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <CategoryBadge category={category} />
          <span className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>{date}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-bold text-base" style={{ color: 'var(--tg-theme-text-color)' }}>
          ${expense.amount.toFixed(2)}
        </span>
        <button
          onClick={() => onDelete(expense.id)}
          className="text-xs"
          style={{ color: 'var(--tg-theme-hint-color)' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
