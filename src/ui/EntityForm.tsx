import type { BuildingSnapshot, LotSnapshot, Place, RelationType } from '../domain/types'
import type { LinkDraft } from '../domain/links'
import { formatBuildingSummary, formatLotSummary } from '../domain/lots'

function emptyLink(): LinkDraft {
  return { label: '', url: '' }
}

function draftLinks(links: { label?: string; url?: string }[] | undefined): LinkDraft[] {
  if (!links?.length) return [emptyLink()]
  return links.map((link) => ({ label: link.label ?? '', url: link.url ?? '' }))
}

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
  sources: LinkDraft[]
  images: LinkDraft[]
  tags: string
  customFields: { key: string; value: string }[]
  lots: LotSnapshot[]
  buildings: BuildingSnapshot[]
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
  onRemoveBuilding: (buildingId: string) => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
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
    sources: [emptyLink()],
    images: [emptyLink()],
    tags: '',
    customFields: [{ key: '', value: '' }],
    lots: [],
    buildings: [],
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
    sources: draftLinks(place.sources),
    images: draftLinks(place.images),
    tags: place.tags.join(', '),
    customFields: place.customFields.length ? place.customFields : [{ key: '', value: '' }],
    lots: place.lots ?? [],
    buildings: place.buildings ?? [],
    point: place.geometry?.type === 'Point' ? [place.geometry.coordinates[0], place.geometry.coordinates[1]] : null,
    polygon:
      place.geometry?.type === 'Polygon' && !(place.lots?.length || place.buildings?.length)
        ? place.geometry.coordinates[0].map(([lng, lat]) => [lng, lat] as [number, number])
        : null,
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
  onRemoveBuilding,
  onSave,
  onCancel,
  onDelete,
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
        Click a building or parcel on the map; otherwise the click is a pin.
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
        <legend>Location</legend>
        <ul className="lot-list">
          {(draft.buildings ?? []).map((building) => (
            <li key={building.buildingId}>
              <div>
                {formatBuildingSummary(building).map((line, index) => (
                  <p key={`${building.buildingId}-${line}`} className={index === 0 ? undefined : 'muted'}>
                    {line}
                  </p>
                ))}
              </div>
              <button type="button" className="chip" onClick={() => onRemoveBuilding(building.buildingId)}>
                Remove
              </button>
            </li>
          ))}
          {(draft.lots ?? []).map((lot) => (
            <li key={lot.number}>
              <div>
                {formatLotSummary(lot).map((line, index) => (
                  <p key={`${lot.number}-${line}`} className={index === 0 ? undefined : 'muted'}>
                    {line}
                  </p>
                ))}
              </div>
              <button type="button" className="chip" onClick={() => onRemoveLot(lot.number)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        {draft.polygon && draft.polygon.length >= 3 && (draft.buildings ?? []).length === 0 && (
          <p className="muted">Borrowed outline ({draft.polygon.length} vertices)</p>
        )}
        {draft.point && (draft.buildings ?? []).length === 0 && (draft.lots ?? []).length === 0 && !draft.polygon && (
          <p className="muted">
            Pin {draft.point[1].toFixed(5)}, {draft.point[0].toFixed(5)}
          </p>
        )}
        {(draft.buildings ?? []).length === 0 && (draft.lots ?? []).length === 0 && !draft.point && !(draft.polygon && draft.polygon.length >= 3) && (
          <span className="muted">Click the map to attach a building, parcel, or pin</span>
        )}
        <div className="row">
          <input
            placeholder="IL 2319 or GLA-HK 910"
            value={lotQuery}
            onChange={(event) => onLotQuery(event.target.value)}
          />
          <button type="button" onClick={onSearchLot}>
            Add parcel
          </button>
        </div>
        {lotStatus && <p className="muted">{lotStatus}</p>}
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
      <LinkRows
        legend="Sources"
        addLabel="Add source"
        rows={draft.sources}
        onChange={(sources) => set({ sources })}
      />
      <LinkRows
        legend="Images"
        addLabel="Add image"
        rows={draft.images}
        onChange={(images) => set({ images })}
      />

      <label>
        Institution continued as
        <select
          value={draft.institutionSuccessorId}
          onChange={(event) => set({ institutionSuccessorId: event.target.value })}
        >
          <option value="">—</option>
          {places
            .filter((place) => place.id !== draft.id)
            .filter((place) => !place.id.startsWith('bdbiar-') || place.updatedAt !== place.createdAt || (place.buildings?.length ?? 0) > 0)
            .slice(0, 300)
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
        {draft.id && onDelete && (
          <button type="button" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

function LinkRows({
  legend,
  addLabel,
  rows,
  onChange,
}: {
  legend: string
  addLabel: string
  rows: LinkDraft[]
  onChange: (rows: LinkDraft[]) => void
}) {
  const update = (index: number, patch: Partial<LinkDraft>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  return (
    <fieldset>
      <legend>{legend}</legend>
      <ul className="link-list">
        {rows.map((row, index) => (
          <li key={index}>
            <input
              placeholder="Label (optional)"
              value={row.label}
              onChange={(event) => update(index, { label: event.target.value })}
            />
            <input
              placeholder="https://"
              value={row.url}
              onChange={(event) => update(index, { url: event.target.value })}
            />
            <button
              type="button"
              className="chip"
              onClick={() => onChange(rows.length === 1 ? [emptyLink()] : rows.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...rows, emptyLink()])}>
        {addLabel}
      </button>
    </fieldset>
  )
}
