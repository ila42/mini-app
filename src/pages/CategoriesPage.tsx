import { useState } from 'react'
import type { Category } from '../types'
import Modal from '../components/Modal'

interface Props {
  categories: Category[]
  onAdd: (cat: Omit<Category, 'id'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#84cc16',
]

const PRESET_EMOJIS = [
  '🍔', '🚗', '🛍️', '💊', '📦', '🏠', '🎮', '✈️',
  '📚', '🎵', '💼', '🏋️', '🍕', '☕', '🐾', '💡',
]

export default function CategoriesPage({ categories, onAdd, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [emoji, setEmoji] = useState(PRESET_EMOJIS[0])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd({ name: name.trim(), color, emoji })
    setName('')
    setColor(PRESET_COLORS[0])
    setEmoji(PRESET_EMOJIS[0])
    setOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
            Категории
          </h1>
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏷️</p>
            <p style={{ color: 'var(--tg-theme-hint-color)' }}>Категорий пока нет</p>
          </div>
        ) : (
          categories.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-3 p-3 rounded-xl mb-2"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: cat.color + '22' }}
              >
                {cat.emoji}
              </div>
              <div className="flex-1">
                <p className="font-medium" style={{ color: 'var(--tg-theme-text-color)' }}>{cat.name}</p>
                <div
                  className="w-3 h-3 rounded-full mt-1 inline-block"
                  style={{ backgroundColor: cat.color }}
                />
              </div>
              <button
                onClick={() => onDelete(cat.id)}
                className="text-sm px-2 py-1 rounded-lg"
                style={{ color: '#ef4444', backgroundColor: '#ef444422' }}
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Новая категория">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Название *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Название категории"
              required
              className="w-full rounded-xl px-3 py-2.5 text-base outline-none"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Эмодзи
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: emoji === e ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Цвет
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold"
            style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
          >
            Создать категорию
          </button>
        </form>
      </Modal>
    </div>
  )
}
