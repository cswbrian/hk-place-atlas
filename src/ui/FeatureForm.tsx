import type { Feature, FeatureStatus } from '../domain/feature'
import { copy, type SiteLocale } from '../domain/locale'
import type { FeatureWrite } from '../domain/wiki'

export type WikiDraft = {
  kind: 'establishment' | 'shop' | 'event'
  nameEn: string
  nameZh: string
  status: FeatureStatus
  startYear: string
  startMonth: string
  startDay: string
  startCirca: boolean
  endYear: string
  endMonth: string
  endDay: string
  endCirca: boolean
  notes: string
  lng: number | null
  lat: number | null
}

const KINDS: WikiDraft['kind'][] = ['establishment', 'shop', 'event']

function yearPart(value: string): number | undefined {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

export function emptyWikiDraft(lng: number | null, lat: number | null): WikiDraft {
  return {
    kind: 'establishment',
    nameEn: '',
    nameZh: '',
    status: 'standing',
    startYear: '',
    startMonth: '',
    startDay: '',
    startCirca: false,
    endYear: '',
    endMonth: '',
    endDay: '',
    endCirca: false,
    notes: '',
    lng,
    lat,
  }
}

export function wikiDraftFromFeature(feature: Feature): WikiDraft {
  const kind = feature.kind === 'shop' || feature.kind === 'event' ? feature.kind : 'establishment'
  return {
    kind,
    nameEn: feature.nameEn,
    nameZh: feature.nameZh,
    status: feature.status,
    startYear: feature.start?.year ? String(feature.start.year) : '',
    startMonth: feature.start?.month ? String(feature.start.month) : '',
    startDay: feature.start?.day ? String(feature.start.day) : '',
    startCirca: Boolean(feature.start?.circa),
    endYear: feature.end?.year ? String(feature.end.year) : '',
    endMonth: feature.end?.month ? String(feature.end.month) : '',
    endDay: feature.end?.day ? String(feature.end.day) : '',
    endCirca: Boolean(feature.end?.circa),
    notes: feature.body.notes,
    lng: feature.lng,
    lat: feature.lat,
  }
}

export function wikiDraftToWrite(draft: WikiDraft): FeatureWrite {
  const startYear = yearPart(draft.startYear)
  const endYear = yearPart(draft.endYear)
  return {
    kind: draft.kind,
    nameEn: draft.nameEn,
    nameZh: draft.nameZh,
    status: draft.status,
    start: startYear
      ? {
          year: startYear,
          month: yearPart(draft.startMonth),
          day: yearPart(draft.startDay),
          circa: draft.startCirca || undefined,
        }
      : null,
    end: endYear
      ? {
          year: endYear,
          month: yearPart(draft.endMonth),
          day: yearPart(draft.endDay),
          circa: draft.endCirca || undefined,
        }
      : null,
    lng: draft.lng,
    lat: draft.lat,
    body: {
      notes: draft.notes,
      sources: [],
      images: [],
      tags: [],
      customFields: [],
    },
  }
}

type Props = {
  locale: SiteLocale
  draft: WikiDraft
  creating: boolean
  error: string | null
  onChange: (draft: WikiDraft) => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}

export function FeatureForm({ locale, draft, creating, error, onChange, onSave, onCancel, onDelete }: Props) {
  const text = copy[locale]
  return (
    <form
      className="panel-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <h2>{creating ? text.add : text.edit}</h2>
      {creating ? (
        <label>
          {text.kind}
          <select
            value={draft.kind}
            onChange={(event) => onChange({ ...draft, kind: event.target.value as WikiDraft['kind'] })}
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {text[kind]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="muted">{text[draft.kind]}</p>
      )}
      <label>
        {text.nameEn}
        <input value={draft.nameEn} onChange={(event) => onChange({ ...draft, nameEn: event.target.value })} required />
      </label>
      <label>
        {text.nameZh}
        <input value={draft.nameZh} onChange={(event) => onChange({ ...draft, nameZh: event.target.value })} />
      </label>
      <label>
        Status
        <select
          value={draft.status}
          onChange={(event) => onChange({ ...draft, status: event.target.value as FeatureStatus })}
        >
          <option value="standing">standing</option>
          <option value="demolished">demolished</option>
          <option value="unknown">unknown</option>
        </select>
      </label>
      <div className="date-row">
        <label>
          Start
          <input value={draft.startYear} onChange={(event) => onChange({ ...draft, startYear: event.target.value })} placeholder="year" />
        </label>
        <label>
          End
          <input value={draft.endYear} onChange={(event) => onChange({ ...draft, endYear: event.target.value })} placeholder="year" />
        </label>
      </div>
      <label>
        {text.notes}
        <textarea value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} rows={4} />
      </label>
      <p className="muted">
        {draft.lat != null && draft.lng != null
          ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`
          : text.clickMap}
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button type="submit" className="primary">
          {text.save}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          {text.cancel}
        </button>
        {onDelete ? (
          <button type="button" onClick={onDelete}>
            {text.delete}
          </button>
        ) : null}
      </div>
    </form>
  )
}
