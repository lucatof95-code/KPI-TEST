interface StarRatingProps {
  value: number
  max?: number
  onChange?: (v: number) => void
  readOnly?: boolean
}

export function StarRating({ value, max = 5, onChange, readOnly = false }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`text-xl transition-colors ${
            star <= value ? 'text-amber-400' : 'text-gray-600'
          } ${!readOnly ? 'hover:text-amber-300 cursor-pointer' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
