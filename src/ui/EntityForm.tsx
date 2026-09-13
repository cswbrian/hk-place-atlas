import type { LotSnapshot, Place, RelationType } from '../domain/types'
import { lotNumbers } from '../domain/lots'

export type Draft = {
  id?: string
  names: { lang: string; text: string; primary?: boolean }[]
  status: Place['status']
  builtYear: string
  builtMonth: string
  builtDay: string
  builtCirca: boolean
  demolishedYear: string
  demolishedMonth: string
  demolishedDay: string
  demolishedCirca: boolean
  locationLabel: string
  notes: string
  sources: { label: string; url: string }[]
  tags: string
  customFields: { key: string; value: string }[]
  lots: LotSnapshot[]
  point: [number, number] | null
  polygon: [number, number][] | null
  siteSuccessorId: string
  institutionSuccessorId: string
}

type Props = {
  draft: Draft
  places: Place[]
  lotQuery: string
  lotStatus: string
  onChange: (draft: Draft) => void
  onLotQuery: (value: string) => void
  onSearchLot: () => void
  onRemoveLot: (number: string) => void
  onStartPoint: () => void
  onStartDraw: () => void
  onSave: () => void
  onCancel: () => void
}

export function emptyDraft(): Draft {
  return {
    names: [
      { lang: 'en', text: '', primary: true },
      { lang: 'zh-Hant', text: '' },
    ],
    status: 'unknown',
    builtYear: '',
    builtMonth: '',
    builtDay: '',
    builtCirca: false,
    demolishedYear: '',
    demolishedMonth: '',
    demolishedDay: '',
    demolishedCirca: false,
    locationLabel: '',
    notes: '',
    sources: [{ label: '', url: '' }],
    tags: '',
    customFields: [{ key: '', value: '' }],
    lots: [],
    point: null,
    polygon: null,
    siteSuccessorId: '',
    institutionSuccessorId: '',
  }
}

export function draftFromPlace(
  place: Place,
  relations: { fromId: string; toId: string; type: RelationType }[],
): Draft {
  const built = place.built
  const demolished = place.demolished
  const site = relations.find((r) => r.fromId === place.id && r.type === 'site_successor')
  const inst = relations.find((r) => r.fromId === place.id && r.type === 'institution_successor')
  return {
    id: place.id,
    names: place.names.length ? place.names : emptyDraft().names,
    status: place.status,
    builtYear: built ? String(built.year) : '',
    builtMonth: built?.month ? String(built.month) : '',
    builtDay: built?.day ? String(built.day) : '',
    builtCirca: Boolean(built?.circa),
    demolishedYear: demolished ? String(demolished.year) : '',
    demolishedMonth: demolished?.month ? String(demolished.month) : '',
    demolishedDay: demolished?.day ? String(demolished.day) : '',
    demolishedCirca: Boolean(demolished?.circa),
    locationLabel: place.locationLabel ?? '',
    notes: place.notes,
    sources: place.sources.length ? place.sources.map((s) => ({ label: s.label, url: s.url ?? '' })) : [{ label: '', url: '' }],
    tags: place.tags.join(', '),
    customFields: place.customFields.length ? place.customFields : [{ key: '', value: '' }],
    lots: place.lots ?? [],
    point: place.geometry.type === 'Point' ? [place.geometry.coordinates[0], place.geometry.coordinates[1]] : null,
    polygon: place.geometry.type === 'Polygon' ? place.geometry.coordinates[0].map(([lng, lat]) => [lng, lat]) : null,
    siteSuccessorId: site?.toId ?? '',
    institutionSuccessorId: inst?.toId ?? '',
  }
}

export function EntityForm({
  draft,
  places,
  lotQuery,
  lotStatus,
  onChange,
  onLotQuery,
  onSearchLot,
  onRemoveLot,
  onStartPoint,
  onStartDraw,
  onSave,
  onCancel,
}: Props) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })

  return (
    <form
      className="panel-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <h2>{draft.id ? 'Edit place' : 'New place'}</h2>
      <p className="hint">
        Click one or more lots on the map, or search a lot number. A large building can take several lots.
      </p>

      <label>
        English name
        <input
          value={draft.names[0]?.text ?? ''}
          onChange={(event) => {
            const names = [...draft.names]
            names[0] = { lang: 'en', text: event.target.value, primary: true }
            set({ names })
          }}
          required
        />
      </label>
      <label>
        中文名稱
        <input
          value={draft.names[1]?.text ?? ''}
          onChange={(event) => {
            const names = [...draft.names]
            names[1] = { lang: 'zh-Hant', text: event.target.value }
            set({ names })
          }}
        />
      </label>

      <fieldset>
        <legend>Lots</legend>
        <div className="chips">
          {lotNumbers({ lots: draft.lots }).map((number) => (
            <button type="button" key={number} className="chip" onClick={() => onRemoveLot(number)}>
              {number} ×
            </button>
          ))}
          {draft.lots.length === 0 && <span className="muted">None yet</span>}
        </div>
        <div className="row">
          <input
            placeholder="IL 2319"
            value={lotQuery}
            onChange={(event) => onLotQuery(event.target.value)}
          />
          <button type="button" onClick={onSearchLot}>
            Add lot
          </button>
        </div>
        {lotStatus && <p className="muted">{lotStatus}</p>}
      </fieldset>

      <fieldset>
        <legend>Fallback shape</legend>
        <div className="row">
          <button type="button" onClick={onStartPoint}>
            Use a point
          </button>
          <button type="button" onClick={onStartDraw}>
            Draw footprint
          </button>
        </div>
        {draft.point && (
          <p className="muted">
            Point {draft.point[1].toFixed(5)}, {draft.point[0].toFixed(5)}
          </p>
        )}
        {draft.polygon && <p className="muted">Polygon with {draft.polygon.length} vertices</p>}
      </fieldset>

      <div className="row">
        <label>
          Built year
          <input value={draft.builtYear} onChange={(event) => set({ builtYear: event.target.value })} placeholder="1865" />
        </label>
        <label>
          Month
          <input value={draft.builtMonth} onChange={(event) => set({ builtMonth: event.target.value })} />
        </label>
        <label>
          Day
          <input value={draft.builtDay} onChange={(event) => set({ builtDay: event.target.value })} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={draft.builtCirca} onChange={(event) => set({ builtCirca: event.target.checked })} />
        Circa
      </label>

      <div className="row">
        <label>
          Demolished year
          <input value={draft.demolishedYear} onChange={(event) => set({ demolishedYear: event.target.value })} />
        </label>
        <label>
          Month
          <input value={draft.demolishedMonth} onChange={(event) => set({ demolishedMonth: event.target.value })} />
        </label>
        <label>
          Day
          <input value={draft.demolishedDay} onChange={(event) => set({ demolishedDay: event.target.value })} />
        </label>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.demolishedCirca}
          onChange={(event) => set({ demolishedCirca: event.target.checked })}
        />
        Circa
      </label>

      <label>
        Status
        <select value={draft.status} onChange={(event) => set({ status: event.target.value as Place['status'] })}>
          <option value="unknown">Unknown</option>
          <option value="standing">Standing</option>
          <option value="demolished">Demolished</option>
        </select>
      </label>

      <label>
        Address / label
        <input value={draft.locationLabel} onChange={(event) => set({ locationLabel: event.target.value })} />
      </label>
      <label>
        Notes
        <textarea value={draft.notes} onChange={(event) => set({ notes: event.target.value })} rows={4} />
      </label>
      <label>
        Tags (comma)
        <input value={draft.tags} onChange={(event) => set({ tags: event.target.value })} />
      </label>
      <label>
        Source
        <input
          placeholder="Label"
          value={draft.sources[0]?.label ?? ''}
          onChange={(event) => set({ sources: [{ ...draft.sources[0], label: event.target.value, url: draft.sources[0]?.url ?? '' }] })}
        />
        <input
          placeholder="https://"
          value={draft.sources[0]?.url ?? ''}
          onChange={(event) => set({ sources: [{ label: draft.sources[0]?.label ?? '', url: event.target.value }] })}
        />
      </label>

      <label>
        Succeeded on this site by
        <select value={draft.siteSuccessorId} onChange={(event) => set({ siteSuccessorId: event.target.value })}>
          <option value="">—</option>
          {places
            .filter((place) => place.id !== draft.id)
            .map((place) => (
              <option key={place.id} value={place.id}>
                {place.names[0]?.text ?? place.id}
              </option>
            ))}
        </select>
      </label>
      <label>
        Institution continued as
        <select
          value={draft.institutionSuccessorId}
          onChange={(event) => set({ institutionSuccessorId: event.target.value })}
        >
          <option value="">—</option>
          {places
            .filter((place) => place.id !== draft.id)
            .map((place) => (
              <option key={place.id} value={place.id}>
                {place.names[0]?.text ?? place.id}
              </option>
            ))}
        </select>
      </label>

      <div className="row">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
