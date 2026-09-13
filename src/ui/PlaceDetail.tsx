import { formatFuzzyDate, primaryName } from '../domain/dates'
import { lineageChain } from '../domain/lineage'
import { lotNumbers } from '../domain/lots'
import type { Place, Relation } from '../domain/types'

type Props = {
  place: Place
  places: Place[]
  relations: Relation[]
  onEdit: () => void
  onDelete: () => void
  onSelect: (id: string) => void
}

function chainLabel(places: Place[], ids: string[]) {
  return ids.map((id) => {
    const place = places.find((item) => item.id === id)
    return place ? primaryName(place) : id
  })
}

export function PlaceDetail({ place, places, relations, onEdit, onDelete, onSelect }: Props) {
  const site = lineageChain(relations, place.id, 'site_successor')
  const institution = lineageChain(relations, place.id, 'institution_successor')
  const lots = lotNumbers(place)

  return (
    <article className="detail">
      <h2>{primaryName(place)}</h2>
      <p className="zh">{place.names.find((name) => name.lang === 'zh-Hant')?.text}</p>
      <p>
        {formatFuzzyDate(place.built)} – {formatFuzzyDate(place.demolished)} · {place.status}
      </p>
      {place.locationLabel && <p>{place.locationLabel}</p>}
      {lots.length > 0 && <p>Lots: {lots.join(', ')}</p>}
      {place.notes && <p className="notes">{place.notes}</p>}
      {place.sources.map((source) => (
        <p key={source.label}>
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label}
            </a>
          ) : (
            source.label
          )}
        </p>
      ))}

      <section>
        <h3>Same site</h3>
        {site.length <= 1 ? (
          <p className="muted">No site links</p>
        ) : (
          <ol>
            {chainLabel(places, site).map((label, index) => (
              <li key={site[index]}>
                <button type="button" className="linkish" onClick={() => onSelect(site[index])}>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section>
        <h3>Institution</h3>
        {institution.length <= 1 ? (
          <p className="muted">No institution links</p>
        ) : (
          <ol>
            {chainLabel(places, institution).map((label, index) => (
              <li key={institution[index]}>
                <button type="button" className="linkish" onClick={() => onSelect(institution[index])}>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="row">
        <button type="button" onClick={onEdit}>
          Edit
        </button>
        <button type="button" onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  )
}
