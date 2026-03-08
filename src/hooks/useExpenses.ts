import { useEffect, useCallback } from 'react'
import { useStoredList } from './useCloudStorage'
import type { Expense } from '../types'

export function useExpenses() {
  const { items: expenses, loading, load, save } = useStoredList<Expense>('expenses')

  useEffect(() => {
    load()
  }, [])

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    const next = [{ ...expense, id: Date.now().toString() }, ...expenses]
    await save(next)
  }, [expenses, save])

  const deleteExpense = useCallback(async (id: string) => {
    await save(expenses.filter(e => e.id !== id))
  }, [expenses, save])

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    await save(expenses.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [expenses, save])

  return { expenses, loading, addExpense, deleteExpense, updateExpense, reload: load }
}
