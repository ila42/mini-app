export type Category = {
  id: string
  name: string
  color: string
  emoji: string
}

export type Expense = {
  id: string
  date: string
  amount: number
  description: string
  categoryId: string
}

export type ShoppingItem = {
  id: string
  name: string
  amount?: number
  categoryId: string
  purchased: boolean
  addedAt: string
}

export type Tab = 'expenses' | 'categories' | 'stats'
