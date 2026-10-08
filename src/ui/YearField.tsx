export function YearField({
  label,
  year,
  circa,
  onYear,
  onCirca,
  yearPlaceholder,
  circaLabel,
}: {
  label: string
  year: string
  circa: boolean
  onYear: (year: string) => void
  onCirca: (circa: boolean) => void
  yearPlaceholder: string
  circaLabel: string
}) {
  return (
    <div>
      <label>
        {label}
        <input
          value={year}
          onChange={(event) => onYear(event.target.value)}
          placeholder={yearPlaceholder}
          inputMode="numeric"
        />
      </label>
      <label className="check">
        <input type="checkbox" checked={circa} onChange={(event) => onCirca(event.target.checked)} />
        {circaLabel}
      </label>
    </div>
  )
}
