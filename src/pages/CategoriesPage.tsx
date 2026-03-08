import { useState } from 'react'
import type { Category } from '../types'
import Modal from '../components/Modal'

interface Props {
  categories: Category[]
  onAdd: (cat: Omit<Category, 'id'>) => Promise<Category>
  onUpdate: (id: string, updates: Partial<Omit<Category, 'id'>>) => Promise<void>
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

type FormState = { name: string; color: string; emoji: string }

function CategoryForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: FormState
  onSubmit: (values: FormState) => Promise<void>
  submitLabel: string
}) {
  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState(initial.color)
  const [emoji, setEmoji] = useState(initial.emoji)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit({ name: name.trim(), color, emoji })
  }

  return (
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
              className="w-10 h-10 rounded-xl text-xl flex items-center justify-center"
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
              className="w-8 h-8 rounded-full"
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
        {submitLabel}
      </button>
    </form>
  )
}

export default function CategoriesPage({ categories, onAdd, onUpdate, onDelete }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)

  const handleAdd = async (values: FormState) => {
    await onAdd(values)
    setAddOpen(false)
  }

  const handleEdit = async (values: FormState) => {
    if (!editTarget) return
    await onUpdate(editTarget.id, values)
    setEditTarget(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
            Категории
          </h1>
          <button
            onClick={() => setAddOpen(true)}
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
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: 'var(--tg-theme-text-color)' }}>{cat.name}</p>
                <div className="w-3 h-3 rounded-full mt-1 inline-block" style={{ backgroundColor: cat.color }} />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditTarget(cat)}
                  className="text-sm px-2 py-1 rounded-lg"
                  style={{ color: 'var(--tg-theme-button-color)', backgroundColor: 'var(--tg-theme-button-color)' + '22' }}
                >
                  Изменить
                </button>
                <button
                  onClick={() => onDelete(cat.id)}
                  className="text-sm px-2 py-1 rounded-lg"
                  style={{ color: '#ef4444', backgroundColor: '#ef444422' }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Новая категория">
        <CategoryForm
          initial={{ name: '', color: PRESET_COLORS[0], emoji: PRESET_EMOJIS[0] }}
          onSubmit={handleAdd}
          submitLabel="Создать категорию"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Редактировать категорию">
        {editTarget && (
          <CategoryForm
            initial={{ name: editTarget.name, color: editTarget.color, emoji: editTarget.emoji }}
            onSubmit={handleEdit}
            submitLabel="Сохранить"
          />
        )}
      </Modal>
    </div>
  )
}
