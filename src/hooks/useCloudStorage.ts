import { useState, useCallback } from 'react'
import { initCloudStorage, isTMA } from '@tma.js/sdk'
import type { CloudStorage } from '@tma.js/sdk'

// Lazy singleton — created once on first access inside a TMA context.
// Falls back to localStorage when running outside Telegram (dev mode).
let _cs: CloudStorage | null = null

function getSDKStorage(): CloudStorage | null {
  if (_cs) return _cs
  if (!isTMA()) return null
  try {
    _cs = initCloudStorage()
    return _cs
  } catch (e) {
    console.warn('[storage] initCloudStorage failed, falling back to localStorage', e)
    return null
  }
}

export function useCloudStorage() {
  const getItem = useCallback(async (key: string): Promise<string | null> => {
    const cs = getSDKStorage()
    if (cs) {
      try {
        const value = await cs.get(key)
        return value || null // SDK returns '' for missing keys
      } catch (e) {
        console.error('[storage] get error:', e)
        return null
      }
    }
    return localStorage.getItem(key)
  }, [])

  const setItem = useCallback(async (key: string, value: string): Promise<void> => {
    const cs = getSDKStorage()
    if (cs) {
      try {
        await cs.set(key, value)
      } catch (e) {
        console.error('[storage] set error:', e)
      }
    } else {
      localStorage.setItem(key, value)
    }
  }, [])

  const removeItem = useCallback(async (key: string): Promise<void> => {
    const cs = getSDKStorage()
    if (cs) {
      try {
        await cs.delete(key)
      } catch (e) {
        console.error('[storage] delete error:', e)
      }
    } else {
      localStorage.removeItem(key)
    }
  }, [])

  return { getItem, setItem, removeItem }
}

// Generic hook for a typed list stored as JSON under one key.
export function useStoredList<T>(key: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const { getItem, setItem } = useCloudStorage()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let raw = await getItem(key)

      // One-time migration: if cloud storage is empty but localStorage has data,
      // copy it over and clear the local copy.
      if (!raw) {
        const localData = localStorage.getItem(key)
        if (localData) {
          await setItem(key, localData)
          localStorage.removeItem(key)
          raw = localData
          console.info(`[storage] Migrated '${key}' from localStorage → Cloud Storage`)
        }
      }

      if (raw) setItems(JSON.parse(raw))
    } catch (e) {
      console.error('[storage] Failed to load', key, e)
    } finally {
      setLoading(false)
    }
  }, [key, getItem, setItem])

  const save = useCallback(async (next: T[]) => {
    setItems(next)
    await setItem(key, JSON.stringify(next))
  }, [key, setItem])

  return { items, loading, load, save, setItems }
}
