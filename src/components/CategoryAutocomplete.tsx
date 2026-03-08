import { useState, useRef, useEffect } from 'react'
import type { Category } from '../types'

interface Props {
  categories: Category[]
  value: string        // category id
  onChange: (id: string) => void
}

export default function CategoryAutocomplete({ categories, value, onChange }: Props) {
  const selected = categories.find(c => c.id === value)
  const [query, setQuery] = useState(selected ? `${selected.emoji} ${selected.name}` : '')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Sync display when value changes externally (e.g. on modal open)
  useEffect(() => {
    const cat = categories.find(c => c.id === value)
    setQuery(cat ? `${cat.emoji} ${cat.name}` : '')
  }, [value, categories])

  const filtered = query.trim() === ''
    ? categories
    : categories.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.emoji.includes(query)
      )

  const select = (cat: Category) => {
    onChange(cat.id)
    setQuery(`${cat.emoji} ${cat.name}`)
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        // Restore selected label if query doesn't match anything
        const cat = categories.find(c => c.id === value)
        setQuery(cat ? `${cat.emoji} ${cat.name}` : '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value, categories])

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
        placeholder="Выберите категорию…"
        autoComplete="off"
        className="w-full rounded-xl px-3 py-2.5 text-base outline-none"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)',
        }}
      />

      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{
            top: 'calc(100% + 4px)',
            backgroundColor: 'var(--tg-theme-bg-color)',
            border: '1px solid',
            borderColor: 'var(--tg-theme-hint-color)',
            maxHeight: '180px',
            overflowY: 'auto',
          }}
        >
          {filtered.map(cat => (
            <button
              key={cat.id}
              type="button"
              onMouseDown={() => select(cat)}   // mousedown fires before blur
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-opacity hover:opacity-80"
              style={{
                backgroundColor: cat.id === value
                  ? cat.color + '22'
                  : 'transparent',
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
        </div>
      )}
    </div>
  )
}
