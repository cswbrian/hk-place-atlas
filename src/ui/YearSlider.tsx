type Props = {
  min: number
  max: number
  value: number
  onChange: (year: number) => void
}

export function YearSlider({ min, max, value, onChange }: Props) {
  return (
    <div
      className="year-slider"
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <span className="year-slider-readout">{value}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label="Year"
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <button type="button" className="ghost" disabled={value === max} onClick={() => onChange(max)}>
        Now
      </button>
    </div>
  )
}
