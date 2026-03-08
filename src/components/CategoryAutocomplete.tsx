import { useState, useRef, useEffect } from 'react'
import type { Category } from '../types'

interface Props {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  // Called when user wants to create a new category by typed name
  onCreateNew?: (name: string) => Promise<Category>
}

export default function CategoryAutocomplete({ categories, value, onChange, onCreateNew }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Sync display text when external value changes (e.g. on reset after submit)
  useEffect(() => {
    const cat = categories.find(c => c.id === value)
    setQuery(cat ? `${cat.emoji} ${cat.name}` : '')
  }, [value, categories])

  const trimmed = query.trim()

  const filtered = trimmed === ''
    ? categories
    : categories.filter(c =>
        c.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        c.emoji.includes(trimmed)
      )

  const exactMatch = categories.some(
    c => c.name.toLowerCase() === trimmed.toLowerCase()
  )

  const showCreateOption = onCreateNew && trimmed.length > 0 && !exactMatch

  const select = (cat: Category) => {
    onChange(cat.id)
    setQuery(`${cat.emoji} ${cat.name}`)
    setOpen(false)
  }

  const handleCreate = async () => {
    if (!onCreateNew || !trimmed) return
    setCreating(true)
    try {
      const newCat = await onCreateNew(trimmed)
      onChange(newCat.id)
      setQuery(`${newCat.emoji} ${newCat.name}`)
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      // Restore selected label
      const cat = categories.find(c => c.id === value)
      setQuery(cat ? `${cat.emoji} ${cat.name}` : '')
      return
    }
    if (e.key === 'Enter') {
      if (open) {
        e.preventDefault() // don't submit form yet
        if (filtered.length > 0) {
          select(filtered[0])
        } else if (showCreateOption) {
          handleCreate()
        }
      }
      // if dropdown is closed, let the form's submit handler fire naturally
    }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !listRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
        const cat = categories.find(c => c.id === value)
        setQuery(cat ? `${cat.emoji} ${cat.name}` : '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value, categories])

  const showList = open && (filtered.length > 0 || showCreateOption)

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Выберите или введите категорию…"
        autoComplete="off"
        className="w-full rounded-xl px-3 py-2.5 text-base outline-none"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)',
        }}
      />

      {showList && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 rounded-xl shadow-lg z-50"
          style={{
            top: 'calc(100% + 4px)',
            backgroundColor: 'var(--tg-theme-bg-color)',
            border: '1px solid',
            borderColor: 'var(--tg-theme-hint-color)',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {filtered.map(cat => (
            <button
              key={cat.id}
              type="button"
              onMouseDown={() => select(cat)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm"
              style={{
                backgroundColor: cat.id === value ? cat.color + '22' : 'transparent',
                color: 'var(--tg-theme-text-color)',
              }}
            >
              <span className="text-base">{cat.emoji}</span>
              <span className="font-medium">{cat.name}</span>
              {cat.id === value && (
                <span className="ml-auto text-xs" style={{ color: cat.color }}>✓</span>
              )}
            </button>
          ))}

          {showCreateOption && (
            <button
              type="button"
              onMouseDown={handleCreate}
              disabled={creating}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm border-t"
              style={{
                borderColor: 'var(--tg-theme-hint-color)',
                color: 'var(--tg-theme-button-color)',
                opacity: creating ? 0.5 : 1,
              }}
            >
              <span>＋</span>
              <span>Создать «{trimmed}»</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
