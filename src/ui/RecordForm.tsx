import type { AtlasRecord, Place, Source } from '../domain/types'
import type { LinkDraft } from '../domain/links'

export type RecordDraft = {
  id?: string
  title: string
  notes: string
  depictedYear: string
  urls: LinkDraft[]
  tags: string
  placeIds: string[]
  point: [number, number] | null
}

type Props = {
  draft: RecordDraft
  places: Place[]
  onChange: (draft: RecordDraft) => void
  onStartPoint: () => void
  onSave: () => void
  onCancel: () => void
}

function emptyLink(): LinkDraft {
  return { label: '', url: '' }
}

export function emptyRecordDraft(point?: [number, number] | null, placeIds: string[] = []): RecordDraft {
  return {
    title: '',
    notes: '',
    depictedYear: '',
    urls: [emptyLink()],
    tags: '',
    placeIds,
    point: point ?? null,
  }
}

export function draftFromRecord(record: AtlasRecord): RecordDraft {
  return {
    id: record.id,
    title: record.title,
    notes: record.notes,
    depictedYear: record.depictedAt ? String(record.depictedAt.year) : '',
    urls: record.urls.length
      ? record.urls.map((url) => ({ label: url.label ?? '', url: url.url ?? '' }))
      : [emptyLink()],
    tags: record.tags.join(', '),
    placeIds: record.links.filter((link) => link.kind === 'place').map((link) => link.placeId),
    point: record.geometry?.type === 'Point'
      ? [record.geometry.coordinates[0], record.geometry.coordinates[1]]
      : null,
  }
}

export function RecordForm({ draft, places, onChange, onStartPoint, onSave, onCancel }: Props) {
  const set = (patch: Partial<RecordDraft>) => onChange({ ...draft, ...patch })

  return (
    <form
      className="panel-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <h2>{draft.id ? 'Edit record' : 'New record'}</h2>
      <p className="hint">
        Paste a social post, article, or Gwulo link. Optionally pin it and link it to one or more places.
      </p>

      <label>
        Title
        <input value={draft.title} onChange={(event) => set({ title: event.target.value })} />
      </label>

      <fieldset>
        <legend>Links</legend>
        {draft.urls.map((row, index) => (
          <div className="row" key={index}>
            <input
              placeholder="Label"
              value={row.label}
              onChange={(event) => {
                const urls = [...draft.urls]
                urls[index] = { ...row, label: event.target.value }
                set({ urls })
              }}
            />
            <input
              placeholder="https://…"
              value={row.url}
              onChange={(event) => {
                const urls = [...draft.urls]
                urls[index] = { ...row, url: event.target.value }
                set({ urls })
              }}
            />
          </div>
        ))}
        <button type="button" onClick={() => set({ urls: [...draft.urls, emptyLink()] })}>
          Add link
        </button>
      </fieldset>

      <label>
        Notes
        <textarea value={draft.notes} onChange={(event) => set({ notes: event.target.value })} rows={4} />
      </label>

      <label>
        About year
        <input
          inputMode="numeric"
          value={draft.depictedYear}
          onChange={(event) => set({ depictedYear: event.target.value })}
        />
      </label>

      <fieldset>
        <legend>Map pin</legend>
        <div className="row">
          <button type="button" onClick={onStartPoint}>
            Drop pin
          </button>
        </div>
        {draft.point && (
          <p className="muted">
            {draft.point[1].toFixed(5)}, {draft.point[0].toFixed(5)}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>Linked places</legend>
        <ul className="lot-list">
          {places.map((place) => {
            const checked = draft.placeIds.includes(place.id)
            const name = place.names.find((item) => item.primary)?.text
              || place.names[0]?.text
              || place.id
            return (
              <li key={place.id}>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      set({
                        placeIds: checked
                          ? draft.placeIds.filter((id) => id !== place.id)
                          : [...draft.placeIds, place.id],
                      })
                    }}
                  />
                  <span>{name}</span>
                </label>
              </li>
            )
          })}
        </ul>
        {places.length === 0 && <p className="muted">No places yet</p>}
      </fieldset>

      <label>
        Tags
        <input value={draft.tags} onChange={(event) => set({ tags: event.target.value })} />
      </label>

      <div className="row">
        <button type="submit">Save record</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function recordFromDraft(
  draft: RecordDraft,
  existing: AtlasRecord | null,
  now: string,
  id: string,
  urls: Source[],
): AtlasRecord {
  const year = Number(draft.depictedYear)
  return {
    id,
    title: draft.title.trim() || urls[0]?.label || urls[0]?.url || 'Untitled record',
    notes: draft.notes,
    depictedAt: Number.isInteger(year) && year > 0 ? { year } : undefined,
    geometry: draft.point ? { type: 'Point', coordinates: draft.point } : undefined,
    urls,
    tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    links: [
      ...draft.placeIds.map((placeId) => ({ kind: 'place' as const, placeId })),
      ...(draft.point && draft.placeIds.length === 0 ? [{ kind: 'point' as const }] : []),
    ],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}
