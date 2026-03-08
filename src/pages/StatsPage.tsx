import type { Category, Expense } from '../types'

interface Props {
  categories: Category[]
  expenses: Expense[]
}

export default function StatsPage({ categories, expenses }: Props) {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth))
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0)

  type StatRow = { category: Category; amount: number; count: number; pct: number }
  const byCategory: StatRow[] = categories
    .map(cat => {
      const catExpenses = monthExpenses.filter(e => e.categoryId === cat.id)
      const amount = catExpenses.reduce((s, e) => s + e.amount, 0)
      return { category: cat, amount, count: catExpenses.length, pct: total > 0 ? (amount / total) * 100 : 0 }
    })
    .filter(r => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const monthLabel = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const pluralExpenses = (n: number) => {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 14) return `${n} расходов`
    if (mod10 === 1) return `${n} расход`
    if (mod10 >= 2 && mod10 <= 4) return `${n} расхода`
    return `${n} расходов`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
          Статистика
        </h1>
        <p className="text-sm capitalize" style={{ color: 'var(--tg-theme-hint-color)' }}>{monthLabel}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div
          className="rounded-2xl p-4 mb-4 text-center"
          style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
        >
          <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>Итого за месяц</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'var(--tg-theme-text-color)' }}>
            {total.toFixed(2)} ₽
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
            {pluralExpenses(monthExpenses.length)}
          </p>
        </div>

        {byCategory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">📊</p>
            <p style={{ color: 'var(--tg-theme-hint-color)' }}>В этом месяце расходов нет</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--tg-theme-hint-color)' }}>
              ПО КАТЕГОРИЯМ
            </p>
            {byCategory.map(({ category, amount, count, pct }) => (
              <div key={category.id} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{category.emoji}</span>
                    <span className="font-medium" style={{ color: 'var(--tg-theme-text-color)' }}>
                      {category.name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                      ({count})
                    </span>
                  </div>
                  <span className="font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
                    {amount.toFixed(2)} ₽
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: category.color }}
                  />
                </div>
                <p className="text-xs mt-0.5 text-right" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  {pct.toFixed(1)}%
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
