import { useState, useEffect } from 'react'
import type { Tab } from './types'
import { useCategories } from './hooks/useCategories'
import { useExpenses } from './hooks/useExpenses'
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
]

export default function App() {
  const [tab, setTab] = useState<Tab>('expenses')

  const { getItem, setItem } = useCloudStorage()
  const { categories, loading: catsLoading, addCategory, updateCategory, deleteCategory, reload: reloadCats, save: saveCategories } = useCategories()
  const { expenses, loading: expLoading, addExpense, deleteExpense } = useExpenses()

  // Seed default categories on first run.
  // Uses Cloud Storage (via saveCategories / setItem) so data persists in Telegram.
  useEffect(() => {
    if (catsLoading || categories.length > 0) return
    ;(async () => {
      const seeded = await getItem('cats_seeded')
      if (!seeded) {
        await saveCategories(DEFAULT_CATEGORIES)
        await setItem('cats_seeded', '1')
      }
    })()
  }, [catsLoading, categories.length, getItem, setItem, saveCategories])

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
