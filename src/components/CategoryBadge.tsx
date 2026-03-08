import type { Category } from '../types'

interface Props {
  category: Category | undefined
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'sm' }: Props) {
  if (!category) return null

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding}`}
      style={{ backgroundColor: category.color + '22', color: category.color }}
    >
      <span>{category.emoji}</span>
      <span>{category.name}</span>
    </span>
  )
}
