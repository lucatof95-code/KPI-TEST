interface ScoreSliderProps {
  label: string
  sublabel?: string
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  error?: string
  leftLabel?: string
  rightLabel?: string
}

export function ScoreSlider({
  label, sublabel, value, min = 1, max = 10, onChange, error, leftLabel, rightLabel
}: ScoreSliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
          {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
        </div>
        <span className="font-mono text-2xl font-bold text-blue-400">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none rounded-full bg-gray-700 cursor-pointer accent-blue-500"
        style={{ backgroundImage: `linear-gradient(to right, #3b82f6 ${pct}%, #374151 ${pct}%)` }}
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{leftLabel || min}</span>
          <span>{rightLabel || max}</span>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
