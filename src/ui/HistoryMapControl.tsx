import { copy, type SiteLocale } from '../domain/locale'
import { HISTORY_MAPS, type HistoryMapId } from '../domain/historyMap'

type Props = {
  locale: SiteLocale
  historyMapId: HistoryMapId | null
  opacity: number
  onToggle: (on: boolean) => void
  onSelect: (id: HistoryMapId) => void
  onOpacity: (value: number) => void
}

export function HistoryMapControl({
  locale,
  historyMapId,
  opacity,
  onToggle,
  onSelect,
  onOpacity,
}: Props) {
  const text = copy[locale]
  const on = historyMapId != null
  const labels: Record<HistoryMapId, string> = {
    'central-1938': text.historyMapCentral1938,
    'victoria-1889': text.historyMapVictoria1889,
    'victoria-1897': text.historyMapVictoria1897,
  }
  return (
    <div className="history-map-control">
      <button
        type="button"
        className={`history-map-toggle${on ? ' is-on' : ''}`}
        aria-pressed={on}
        onClick={() => onToggle(!on)}
      >
        {text.historyMap}
      </button>
      {on ? (
        <div className="history-map-panel">
          <div className="history-map-sheets" role="radiogroup" aria-label={text.historyMap}>
            {HISTORY_MAPS.map((sheet) => (
              <label key={sheet.id} className="history-map-sheet">
                <input
                  type="radio"
                  name="history-map-sheet"
                  checked={historyMapId === sheet.id}
                  onChange={() => onSelect(sheet.id)}
                />
                <span>{labels[sheet.id]}</span>
              </label>
            ))}
          </div>
          <label className="history-map-opacity">
            <span>{text.historyMapOpacity}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(event) => onOpacity(Number(event.target.value))}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
