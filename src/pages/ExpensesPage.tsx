import { useState, useMemo } from 'react'
import type { Category, Expense } from '../types'
import ExpenseCard from '../components/ExpenseCard'
import Modal from '../components/Modal'
import AmountInput from '../components/AmountInput'
import CategoryAutocomplete from '../components/CategoryAutocomplete'

interface Props {
  categories: Category[]
  expenses: Expense[]
  loading: boolean
  onAdd: (expense: Omit<Expense, 'id'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddCategory: (cat: Omit<Category, 'id'>) => Promise<Category>
}

export default function ExpensesPage({ categories, expenses, loading, onAdd, onDelete, onAddCategory }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [filterCatId, setFilterCatId] = useState<string | null>(null)

  const usedCategories = useMemo(() => {
    const ids = new Set(expenses.map(e => e.categoryId))
    return categories.filter(c => ids.has(c.id))
  }, [expenses, categories])

  const filtered = filterCatId
    ? expenses.filter(e => e.categoryId === filterCatId)
    : expenses

  const handleOpen = () => {
    setAmount('')
    setDescription('')
    setCategoryId('')
    setDate(new Date().toISOString().slice(0, 10))
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(Number(amount))) return
    try {
      await onAdd({
        amount: parseFloat(amount),
        description,
        categoryId: categoryId || categories[0]?.id || '',
        date,
      })
    } finally {
      setOpen(false)
    }
  }

  // Auto-create category when user types a new one
  const handleCreateCategory = async (name: string): Promise<Category> => {
    const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899']
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    return await onAddCategory({ name, emoji: '📦', color })
  }

  const inputStyle = {
    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
    color: 'var(--tg-theme-text-color)',
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const totalToday = expenses
    .filter(e => e.date === todayStr)
    .reduce((s, e) => s + e.amount, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
            Расходы
          </h1>
          <button
            onClick={handleOpen}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
          >
            +
          </button>
        </div>
        {expenses.length > 0 && (
          <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Сегодня:{' '}
            <span className="font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
              {totalToday.toFixed(2)} ₽
            </span>
          </p>
        )}
      </div>

      {/* Category filter tabs */}
      {usedCategories.length > 0 && (
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilterCatId(null)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: filterCatId === null ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
              color: filterCatId === null ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-hint-color)',
            }}
          >
            Все
          </button>
          {usedCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCatId(filterCatId === cat.id ? null : cat.id)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: filterCatId === cat.id ? cat.color : cat.color + '22',
                color: filterCatId === cat.id ? '#fff' : cat.color,
              }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Expense list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--tg-theme-hint-color)' }}>Загрузка…</p>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💸</p>
            <p style={{ color: 'var(--tg-theme-hint-color)' }}>Расходов пока нет</p>
            <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>Нажмите + чтобы добавить</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p style={{ color: 'var(--tg-theme-hint-color)' }}>Нет расходов в этой категории</p>
          </div>
        ) : (
          filtered.map(expense => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              category={categories.find(c => c.id === expense.categoryId)}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Новый расход">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Сумма *
            </label>
            <AmountInput value={amount} onChange={setAmount} placeholder="0.00" required />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Описание
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Что купили?"
              className="w-full rounded-xl px-3 py-2.5 text-base outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Категория
            </label>
            <CategoryAutocomplete
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onCreateNew={handleCreateCategory}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Дата
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-base outline-none"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold mt-1"
            style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
          >
            Добавить расход
          </button>
        </form>
      </Modal>
    </div>
  )
}
