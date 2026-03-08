import { useState, useCallback } from 'react'

// In-memory fallback for browser dev (no Telegram context)
const memoryStore: Record<string, string> = {}

function cloudStorageAvailable(): boolean {
  return !!window.Telegram?.WebApp?.CloudStorage
}

export function useCloudStorage() {
  const getItem = useCallback((key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      if (cloudStorageAvailable()) {
        window.Telegram!.WebApp.CloudStorage.getItem(key, (err, value) => {
          if (err) {
            console.error('CloudStorage.getItem error:', err)
            resolve(null)
          } else {
            resolve(value || null)
          }
        })
      } else {
        // Fallback to localStorage in dev
        const val = localStorage.getItem(key)
        resolve(val)
      }
    })
  }, [])

  const setItem = useCallback((key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      if (cloudStorageAvailable()) {
        window.Telegram!.WebApp.CloudStorage.setItem(key, value, (err) => {
          if (err) console.error('CloudStorage.setItem error:', err)
          resolve()
        })
      } else {
        localStorage.setItem(key, value)
        resolve()
      }
    })
  }, [])

  const removeItem = useCallback((key: string): Promise<void> => {
    return new Promise((resolve) => {
      if (cloudStorageAvailable()) {
        window.Telegram!.WebApp.CloudStorage.removeItem(key, (err) => {
          if (err) console.error('CloudStorage.removeItem error:', err)
          resolve()
        })
      } else {
        localStorage.removeItem(key)
        resolve()
      }
    })
  }, [])

  return { getItem, setItem, removeItem }
}

// Generic hook for a typed list stored as JSON under one key
export function useStoredList<T>(key: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const { getItem, setItem } = useCloudStorage()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await getItem(key)
      if (raw) setItems(JSON.parse(raw))
    } catch (e) {
      console.error('Failed to load', key, e)
    } finally {
      setLoading(false)
    }
  }, [key, getItem])

  const save = useCallback(async (next: T[]) => {
    setItems(next)
    await setItem(key, JSON.stringify(next))
  }, [key, setItem])

  return { items, loading, load, save, setItems }
}
