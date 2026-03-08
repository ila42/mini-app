import { useEffect, useCallback } from 'react'
import { useStoredList } from './useCloudStorage'
import type { ShoppingItem } from '../types'

export function useShopping() {
  const { items: shoppingItems, loading, load, save } = useStoredList<ShoppingItem>('shopping')

  useEffect(() => {
    load()
  }, [])

  const addItem = useCallback(async (item: Omit<ShoppingItem, 'id' | 'addedAt' | 'purchased'>) => {
    const next = [
      ...shoppingItems,
      { ...item, id: Date.now().toString(), purchased: false, addedAt: new Date().toISOString() },
    ]
    await save(next)
  }, [shoppingItems, save])

  const togglePurchased = useCallback(async (id: string) => {
    await save(shoppingItems.map(i => i.id === id ? { ...i, purchased: !i.purchased } : i))
  }, [shoppingItems, save])

  const deleteItem = useCallback(async (id: string) => {
    await save(shoppingItems.filter(i => i.id !== id))
  }, [shoppingItems, save])

  const clearPurchased = useCallback(async () => {
    await save(shoppingItems.filter(i => !i.purchased))
  }, [shoppingItems, save])

  return { shoppingItems, loading, addItem, togglePurchased, deleteItem, clearPurchased, reload: load }
}
