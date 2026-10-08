import { useEffect, useRef, useState } from 'react'
import { fetchLinkPreview } from '../api/links'
import { isHttpUrl } from '../domain/linkMeta'
import type { Feature, FeatureBody, FeatureStatus } from '../domain/feature'
import { copy, type SiteLocale } from '../domain/locale'
import type { Source } from '../domain/types'
import type { FeatureWrite } from '../domain/wiki'
import { Button } from './Button'
import { MinusIcon, PlusIcon } from './icons'
import { BackIcon, PanelCloseIcon } from './icons'
import { YearField } from './YearField'

export const FEATURE_YEAR_MIN = 1700
export const FEATURE_YEAR_MAX = 2100
export const MAX_DRAFT_SOURCES = 20

export type WikiDraftIssue = 'year' | 'yearOrder' | 'standingEnd' | 'sourceUrl'

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
  sources: Source[]
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

function compactSources(sources: Source[]): Source[] {
  return sources.flatMap((source) => {
    const url = source.url?.trim() ?? ''
    if (!url) return []
    const label = source.label?.trim()
    const siteName = source.siteName?.trim()
    const icon = source.icon?.trim()
    return [
      {
        url,
        ...(label ? { label } : {}),
        ...(siteName ? { siteName } : {}),
        ...(icon ? { icon } : {}),
      },
    ]
  })
}

export function wikiDraftIssues(draft: WikiDraft): WikiDraftIssue[] {
  const issues: WikiDraftIssue[] = []
  const start = parseYearField(draft.startYear)
  const end = parseYearField(draft.endYear)
  if (start === 'invalid' || end === 'invalid') issues.push('year')
  if (typeof start === 'number' && typeof end === 'number' && end < start) issues.push('yearOrder')
  if (formStatus(draft.status) === 'standing' && draft.endYear.trim()) issues.push('standingEnd')
  for (const source of draft.sources) {
    const url = source.url?.trim() ?? ''
    if (url && !isHttpUrl(url)) {
      issues.push('sourceUrl')
      break
    }
  }
  return issues
}

function issueMessage(text: (typeof copy)[SiteLocale], issue: WikiDraftIssue): string {
  if (issue === 'yearOrder') return text.placeYearOrder
  if (issue === 'standingEnd') return text.placeStandingEnd
  if (issue === 'sourceUrl') return text.placeSourceUrlInvalid
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
    sources: [],
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
    sources: feature.body.sources.map((source) => ({ ...source })),
    lng: feature.lng,
    lat: feature.lat,
  }
}

export function wikiDraftToWrite(draft: WikiDraft, base?: FeatureBody): FeatureWrite {
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
      sources: compactSources(draft.sources),
      images: base?.images ?? [],
      tags: base?.tags ?? [],
      customFields: base?.customFields ?? [],
      district: base?.district,
      region: base?.region,
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

function updateSource(draft: WikiDraft, index: number, patch: Partial<Source>): WikiDraft {
  return {
    ...draft,
    sources: draft.sources.map((source, i) => (i === index ? { ...source, ...patch } : source)),
  }
}

export function FeatureForm({ locale, draft, creating, error, onChange, onSave, onCancel, onDelete }: Props) {
  const text = copy[locale]
  const [localError, setLocalError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<number | null>(null)
  const draftRef = useRef(draft)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    draftRef.current = draft
    onChangeRef.current = onChange
  }, [draft, onChange])
  useEffect(() => {
    setLocalError(null)
  }, [draft])
  const shownError = localError ?? error

  async function previewAt(index: number, rawUrl?: string) {
    const latest = draftRef.current
    const url = (rawUrl ?? latest.sources[index]?.url ?? '').trim()
    if (!url || !isHttpUrl(url)) return
    setPreviewing(index)
    try {
      const meta = await fetchLinkPreview(url)
      const current = draftRef.current
      const source = current.sources[index]
      if (!source) return
      onChangeRef.current(
        updateSource(
          {
            ...current,
            sources: current.sources.map((item, i) => (i === index ? { ...item, url } : item)),
          },
          index,
          {
            label: source.label?.trim() ? source.label : meta.title,
            siteName: meta.siteName ?? source.siteName,
            icon: meta.icon ?? source.icon,
          },
        ),
      )
    } finally {
      setPreviewing((active) => (active === index ? null : active))
    }
  }

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
      <Button
        variant="ghost"
        className="detail-back"
        aria-label={dismissLabel}
        title={dismissLabel}
        onClick={onCancel}
      >
        {creating ? <PanelCloseIcon /> : <BackIcon />}
      </Button>
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
        <YearField
          label={text.start}
          year={draft.startYear}
          circa={draft.startCirca}
          onYear={(startYear) => onChange({ ...draft, startYear })}
          onCirca={(startCirca) => onChange({ ...draft, startCirca })}
          yearPlaceholder={text.year}
          circaLabel={text.circa}
        />
        <YearField
          label={text.end}
          year={draft.endYear}
          circa={draft.endCirca}
          onYear={(endYear) => onChange(withEndYear(draft, endYear))}
          onCirca={(endCirca) => onChange({ ...draft, endCirca })}
          yearPlaceholder={text.year}
          circaLabel={text.circa}
        />
      </div>
      <label>
        {text.notes}
        <textarea value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} rows={4} />
      </label>
      <fieldset className="links-field">
        <legend>{text.referenceLinks}</legend>
        {draft.sources.map((source, index) => (
          <div key={index} className="link-row">
            <div className="link-row-fields">
              <label className="link-field">
                <span className="sr-only">{text.linkUrl}</span>
                <input
                  type="url"
                  value={source.url ?? ''}
                  onChange={(event) => onChange(updateSource(draft, index, { url: event.target.value }))}
                  onBlur={(event) => void previewAt(index, event.currentTarget.value)}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData('text')
                    window.setTimeout(() => void previewAt(index, pasted || draftRef.current.sources[index]?.url), 0)
                  }}
                  placeholder="https://"
                />
              </label>
              <label className="link-field">
                <span className="sr-only">{text.linkTitle}</span>
                <input
                  value={source.label ?? ''}
                  onChange={(event) => onChange(updateSource(draft, index, { label: event.target.value }))}
                  placeholder={text.linkTitle}
                />
              </label>
              {(source.siteName || source.icon || previewing === index) && source.url?.trim() ? (
                <div className="ref-preview">
                  {source.icon ? (
                    <img src={source.icon} alt="" width={16} height={16} loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="ref-icon-fallback" aria-hidden="true" />
                  )}
                  <span className="ref-preview-site muted">{source.siteName ?? ''}</span>
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              className="link-remove"
              aria-label={text.removeLink}
              title={text.removeLink}
              onClick={() => onChange({ ...draft, sources: draft.sources.filter((_, i) => i !== index) })}
            >
              <MinusIcon />
            </Button>
          </div>
        ))}
        {draft.sources.length < MAX_DRAFT_SOURCES ? (
          <Button
            variant="ghost"
            className="link-add"
            aria-label={text.addLink}
            title={text.addLink}
            onClick={() => onChange({ ...draft, sources: [...draft.sources, { url: '' }] })}
          >
            <PlusIcon />
          </Button>
        ) : null}
      </fieldset>
      <p className="muted">
        {draft.lat != null && draft.lng != null
          ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`
          : text.clickMap}
      </p>
      {shownError ? <p className="error">{shownError}</p> : null}
      <div className="row form-actions">
        <Button variant="primary" type="submit">
          {text.save}
        </Button>
        {onDelete ? (
          <Button variant="link" className="form-delete" onClick={onDelete}>
            {text.delete}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
