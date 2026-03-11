import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense, Category } from '../types'

interface SupabaseRow {
  id: string
  user_id: number
  expense_date: string
  amount: number
  description: string | null
  category: string | null
}

function getTelegramUserId(): number | null {
  try {
    return (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null
  } catch {
    return null
  }
}

function mapRow(row: SupabaseRow, categories: Category[]): Expense {
  const name = (row.category ?? '').toLowerCase().trim()
  const match = categories.find(c => c.name.toLowerCase() === name)
  const fallback = categories.find(c => c.name === 'Другое')
  return {
    id: String(row.id),
    date: row.expense_date,
    amount: Number(row.amount),
    description: row.description ?? '',
    categoryId: match?.id ?? fallback?.id ?? '',
  }
}

export function useSupabaseExpenses(categories: Category[]) {
  const [rawRows, setRawRows] = useState<SupabaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const categoriesRef = useRef(categories)
  useEffect(() => { categoriesRef.current = categories }, [categories])

  const userId = useMemo(() => getTelegramUserId(), [])

  const fetchExpenses = useCallback(async () => {
    if (!userId || !supabase) {
      if (!supabase) console.warn('[supabase] client is null — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('expense_date', { ascending: false })
      if (error) throw error
      setRawRows((data ?? []) as SupabaseRow[])
    } catch (e) {
      console.error('[supabase] fetchExpenses error:', e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Realtime — live updates when the bot adds an expense
  useEffect(() => {
    if (!userId || !supabase) return

    const channel = supabase
      .channel(`expenses:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          setRawRows(prev => {
            // Avoid duplicates in case we added optimistically
            const incoming = payload.new as SupabaseRow
            if (prev.some(r => String(r.id) === String(incoming.id))) return prev
            return [incoming, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'expenses',
        },
        payload => {
          setRawRows(prev => prev.filter(r => String(r.id) !== String(payload.old.id)))
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [userId])

  // Map raw rows to Expense type — re-runs automatically when categories load
  const expenses = useMemo(
    () => rawRows.map(r => mapRow(r, categories)),
    [rawRows, categories]
  )

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    if (!userId || !supabase) return
    const catName = categoriesRef.current.find(c => c.id === expense.categoryId)?.name ?? 'Другое'
    const { error } = await supabase.from('expenses').insert({
      user_id: userId,
      expense_date: expense.date,
      amount: expense.amount,
      description: expense.description || null,
      category: catName,
    })
    if (error) throw error
    // Realtime INSERT event will add the row to state automatically
  }, [userId])

  const deleteExpense = useCallback(async (id: string) => {
    if (!supabase) return
    // Optimistic UI — remove immediately
    setRawRows(prev => prev.filter(r => String(r.id) !== id))
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) {
      // On failure, re-fetch to restore correct state
      console.error('[supabase] deleteExpense error:', error)
      fetchExpenses()
    }
  }, [fetchExpenses])

  return { expenses, loading, addExpense, deleteExpense, reload: fetchExpenses }
}
