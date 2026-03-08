import { useState } from 'react'
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
}

export default function ExpensesPage({ categories, expenses, loading, onAdd, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const handleOpen = () => {
    setCategoryId(categories[0]?.id ?? '')
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(Number(amount))) return
    await onAdd({
      amount: parseFloat(amount),
      description,
      categoryId: categoryId || categories[0]?.id || '',
      date,
    })
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().slice(0, 10))
    setOpen(false)
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

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--tg-theme-hint-color)' }}>Загрузка…</p>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💸</p>
            <p style={{ color: 'var(--tg-theme-hint-color)' }}>Расходов пока нет</p>
            <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>Нажмите + чтобы добавить</p>
          </div>
        ) : (
          expenses.map(expense => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              category={categories.find(c => c.id === expense.categoryId)}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

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
