import { useEffect, useState } from 'react'
import type { Feature, FeatureStatus } from '../domain/feature'
import { copy, type SiteLocale } from '../domain/locale'
import type { FeatureWrite } from '../domain/wiki'

export const FEATURE_YEAR_MIN = 1700
export const FEATURE_YEAR_MAX = 2100

export type WikiDraftIssue = 'year' | 'yearOrder' | 'standingEnd'

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
const KIND_ENABLED: Record<WikiDraft['kind'], boolean> = {
  establishment: true,
  shop: false,
  event: false,
}
const STATUSES = ['standing', 'demolished'] as const

function formStatus(status: FeatureStatus): 'standing' | 'demolished' {
  return status === 'demolished' ? 'demolished' : 'standing'
}

/** Entering a demolition year marks the place demolished right away. */
export function withEndYear(draft: WikiDraft, endYear: string): WikiDraft {
  if (!endYear.trim()) return { ...draft, endYear }
  return { ...draft, endYear, status: 'demolished' }
}

/** Choosing standing clears any demolition year. */
export function withStatus(draft: WikiDraft, status: 'standing' | 'demolished'): WikiDraft {
  if (status === 'standing') {
    return { ...draft, status, endYear: '', endMonth: '', endDay: '', endCirca: false }
  }
  return { ...draft, status }
}

function parseYearField(value: string): number | null | 'invalid' {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return 'invalid'
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < FEATURE_YEAR_MIN || n > FEATURE_YEAR_MAX) return 'invalid'
  return n
}

export function wikiDraftIssues(draft: WikiDraft): WikiDraftIssue[] {
  const issues: WikiDraftIssue[] = []
  const start = parseYearField(draft.startYear)
  const end = parseYearField(draft.endYear)
  if (start === 'invalid' || end === 'invalid') issues.push('year')
  if (typeof start === 'number' && typeof end === 'number' && end < start) issues.push('yearOrder')
  if (formStatus(draft.status) === 'standing' && draft.endYear.trim()) issues.push('standingEnd')
  return issues
}

function issueMessage(text: (typeof copy)[SiteLocale], issue: WikiDraftIssue): string {
  if (issue === 'yearOrder') return text.placeYearOrder
  if (issue === 'standingEnd') return text.placeStandingEnd
  return text.placeYearInvalid
}

function yearPart(value: string): number | undefined {
  const parsed = parseYearField(value)
  return typeof parsed === 'number' ? parsed : undefined
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
    status: formStatus(draft.status),
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
  const [localError, setLocalError] = useState<string | null>(null)
  useEffect(() => {
    setLocalError(null)
  }, [draft])
  const shownError = localError ?? error
  const dismissLabel = creating ? text.close : text.cancel
  return (
    <form
      className="panel-form"
      onSubmit={(event) => {
        event.preventDefault()
        const issue = wikiDraftIssues(draft)[0]
        if (issue) {
          setLocalError(issueMessage(text, issue))
          return
        }
        setLocalError(null)
        onSave()
      }}
    >
      <button
        type="button"
        className="ghost detail-back"
        aria-label={dismissLabel}
        title={dismissLabel}
        onClick={onCancel}
      >
        {creating ? (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        ) : (
          <svg viewBox="4.2 5.2 15.6 13.6" width="20" height="18" aria-hidden="true" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 12H5M11 6l-6 6 6 6"
            />
          </svg>
        )}
      </button>
      <h2>{creating ? text.add : text.edit}</h2>
      {creating ? (
        <label>
          {text.kind}
          <select
            value={KIND_ENABLED[draft.kind] ? draft.kind : 'establishment'}
            onChange={(event) => {
              const kind = event.target.value as WikiDraft['kind']
              if (!KIND_ENABLED[kind]) return
              onChange({ ...draft, kind })
            }}
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind} disabled={!KIND_ENABLED[kind]}>
                {KIND_ENABLED[kind] ? text[kind] : `${text[kind]}${text.comingSoon}`}
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
      <fieldset className="status-field">
        <legend>{text.status}</legend>
        <div className="status-options">
          {STATUSES.map((status) => (
            <label key={status} className="check">
              <input
                type="radio"
                name="status"
                value={status}
                checked={formStatus(draft.status) === status}
                onChange={() => onChange(withStatus(draft, status))}
              />
              {text[status]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="date-row">
        <div>
          <label>
            {text.start}
            <input value={draft.startYear} onChange={(event) => onChange({ ...draft, startYear: event.target.value })} placeholder={text.year} />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.startCirca}
              onChange={(event) => onChange({ ...draft, startCirca: event.target.checked })}
            />
            {text.circa}
          </label>
        </div>
        <div>
          <label>
            {text.end}
            <input
              value={draft.endYear}
              onChange={(event) => onChange(withEndYear(draft, event.target.value))}
              placeholder={text.year}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.endCirca}
              onChange={(event) => onChange({ ...draft, endCirca: event.target.checked })}
            />
            {text.circa}
          </label>
        </div>
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
      {shownError ? <p className="error">{shownError}</p> : null}
      <div className="row form-actions">
        <button type="submit" className="primary">
          {text.save}
        </button>
        {onDelete ? (
          <button type="button" className="linkish form-delete" onClick={onDelete}>
            {text.delete}
          </button>
        ) : null}
      </div>
    </form>
  )
}
