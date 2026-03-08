interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export default function AmountInput({ value, onChange, placeholder = '0.00', required }: Props) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-xl px-3 py-2.5 text-base outline-none border"
      style={{
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        color: 'var(--tg-theme-text-color)',
        borderColor: 'transparent',
      }}
    />
  )
}
