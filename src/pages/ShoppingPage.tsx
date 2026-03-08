import { useState } from 'react'
import type { Category } from '../types'
import { useShopping } from '../hooks/useShopping'
import ShoppingItemRow from '../components/ShoppingItemRow'
import Modal from '../components/Modal'
import AmountInput from '../components/AmountInput'
import CategoryAutocomplete from '../components/CategoryAutocomplete'

interface Props {
  categories: Category[]
}

export default function ShoppingPage({ categories }: Props) {
  const { shoppingItems, loading, addItem, togglePurchased, deleteItem, clearPurchased } = useShopping()
  const [open, setOpen] = useState(false)

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await addItem({
      name: name.trim(),
      amount: amount ? parseFloat(amount) : undefined,
      categoryId: categoryId || categories[0]?.id || '',
    })
    setName('')
    setAmount('')
    setOpen(false)
  }

  const inputStyle = {
    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
    color: 'var(--tg-theme-text-color)',
  }

  const pending = shoppingItems.filter(i => !i.purchased)
  const purchased = shoppingItems.filter(i => i.purchased)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
            Список покупок
          </h1>
          <div className="flex gap-2">
            {purchased.length > 0 && (
              <button
                onClick={clearPurchased}
                className="text-sm px-3 py-1 rounded-full"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-hint-color)' }}
              >
                Очистить
              </button>
            )}
            <button
              onClick={() => { setCategoryId(categories[0]?.id ?? ''); setOpen(true) }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
            >
              +
            </button>
          </div>
        </div>
        {shoppingItems.length > 0 && (
          <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
            {pending.length} осталось · {purchased.length} куплено
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--tg-theme-hint-color)' }}>Загрузка…</p>
        ) : shoppingItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🛒</p>
            <p style={{ color: 'var(--tg-theme-hint-color)' }}>Список покупок пуст</p>
            <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>Нажмите + чтобы добавить товар</p>
          </div>
        ) : (
          <>
            {pending.map(item => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                category={categories.find(c => c.id === item.categoryId)}
                onToggle={togglePurchased}
                onDelete={deleteItem}
              />
            ))}
            {purchased.length > 0 && (
              <>
                <p className="text-xs font-semibold mt-4 mb-2" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  КУПЛЕНО
                </p>
                {purchased.map(item => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    category={categories.find(c => c.id === item.categoryId)}
                    onToggle={togglePurchased}
                    onDelete={deleteItem}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Новый товар">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Название *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Молоко, хлеб…"
              required
              className="w-full rounded-xl px-3 py-2.5 text-base outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Примерная стоимость (необязательно)
            </label>
            <AmountInput value={amount} onChange={setAmount} />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Категория
            </label>
            <CategoryAutocomplete
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold mt-1"
            style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
          >
            Добавить в список
          </button>
        </form>
      </Modal>
    </div>
  )
}
