import { useState, useEffect } from 'react'
import type { Tab } from './types'
import { useCategories } from './hooks/useCategories'
import { useSupabaseExpenses } from './hooks/useSupabaseExpenses'
import { useCloudStorage } from './hooks/useCloudStorage'
import BottomNav from './components/BottomNav'
import ExpensesPage from './pages/ExpensesPage'
import CategoriesPage from './pages/CategoriesPage'
import StatsPage from './pages/StatsPage'

const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Еда', color: '#ef4444', emoji: '🍔' },
  { id: '2', name: 'Транспорт', color: '#3b82f6', emoji: '🚗' },
  { id: '3', name: 'Покупки', color: '#a855f7', emoji: '🛍️' },
  { id: '4', name: 'Здоровье', color: '#22c55e', emoji: '💊' },
  { id: '5', name: 'Другое', color: '#6b7280', emoji: '📦' },
  { id: '6', name: 'Подписки', color: '#f59e0b', emoji: '📱' },
  { id: '7', name: 'Саша', color: '#ec4899', emoji: '👤' },
  { id: '8', name: 'Переводы', color: '#14b8a6', emoji: '💸' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('expenses')

  const { getItem, setItem } = useCloudStorage()
  const { categories, loading: catsLoading, addCategory, updateCategory, deleteCategory, save: saveCategories } = useCategories()
  const { expenses, loading: expLoading, addExpense, deleteExpense } = useSupabaseExpenses(categories)

  // Seed default categories on first run.
  // Uses Cloud Storage (via saveCategories / setItem) so data persists in Telegram.
  useEffect(() => {
    if (catsLoading) return
    ;(async () => {
      const seeded = await getItem('cats_seeded')
      if (!seeded || categories.length === 0) {
        await saveCategories(DEFAULT_CATEGORIES)
        await setItem('cats_seeded', '1')
        return
      }
      // Migration: add any DEFAULT_CATEGORIES missing by name (e.g. bot-specific ones)
      const existingNames = new Set(categories.map(c => c.name.toLowerCase()))
      const missing = DEFAULT_CATEGORIES.filter(d => !existingNames.has(d.name.toLowerCase()))
      if (missing.length > 0) {
        await saveCategories([...categories, ...missing])
      }
    })()
  }, [catsLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      <div className="flex-1 overflow-hidden" style={{ paddingBottom: '4.5rem' }}>
        {tab === 'expenses' && (
          <ExpensesPage
            categories={categories}
            expenses={expenses}
            loading={expLoading}
            onAdd={addExpense}
            onDelete={deleteExpense}
            onAddCategory={addCategory}
          />
        )}
        {tab === 'categories' && (
          <CategoriesPage
            categories={categories}
            onAdd={addCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}
        {tab === 'stats' && (
          <StatsPage categories={categories} expenses={expenses} />
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
