import { useEffect, useCallback } from 'react'
import { useStoredList } from './useCloudStorage'
import type { Category } from '../types'

export function useCategories() {
  const { items: categories, loading, load, save } = useStoredList<Category>('categories')

  useEffect(() => {
    load()
  }, [])

  const addCategory = useCallback(async (cat: Omit<Category, 'id'>): Promise<Category> => {
    const newCat: Category = { ...cat, id: Date.now().toString() }
    await save([...categories, newCat])
    return newCat
  }, [categories, save])

  const updateCategory = useCallback(async (id: string, updates: Partial<Omit<Category, 'id'>>) => {
    await save(categories.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [categories, save])

  const deleteCategory = useCallback(async (id: string) => {
    await save(categories.filter(c => c.id !== id))
  }, [categories, save])

  return { categories, loading, addCategory, updateCategory, deleteCategory, reload: load }
}
