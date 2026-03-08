import { useEffect, useCallback } from 'react'
import { useStoredList } from './useCloudStorage'
import type { Category } from '../types'

export function useCategories() {
  const { items: categories, loading, load, save } = useStoredList<Category>('categories')

  useEffect(() => {
    load()
  }, [])

  const addCategory = useCallback(async (cat: Omit<Category, 'id'>) => {
    const next = [...categories, { ...cat, id: Date.now().toString() }]
    await save(next)
  }, [categories, save])

  const deleteCategory = useCallback(async (id: string) => {
    await save(categories.filter(c => c.id !== id))
  }, [categories, save])

  return { categories, loading, addCategory, deleteCategory, reload: load }
}
