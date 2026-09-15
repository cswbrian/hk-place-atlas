import { formatFuzzyDate, primaryName } from '../domain/dates'
import { lineageChain } from '../domain/lineage'
import { linkText } from '../domain/links'
import { formatBuildingSummary, formatLotSummary } from '../domain/lots'
import { siteCluster } from '../domain/site'
import type { Place, Relation, Source } from '../domain/types'

type Props = {
  place: Place
  places: Place[]
  relations: Relation[]
  onEdit: () => void
  onSelect: (id: string) => void
  onBack?: () => void
}

function chainLabel(places: Place[], ids: string[]) {
  return ids.map((id) => {
    const place = places.find((item) => item.id === id)
    return place ? primaryName(place) : id
  })
}

export function PlaceDetail({
  place,
  places,
  relations,
  onEdit,
  onSelect,
  onBack,
}: Props) {
  const site = siteCluster(places, place.id)
  const institution = lineageChain(relations, place.id, 'institution_successor')
  const lots = place.lots ?? []
  const buildings = place.buildings ?? []

  return (
    <article className="detail">
      <h2>{primaryName(place)}</h2>
      <p className="zh">{place.names.find((name) => name.lang === 'zh-Hant')?.text}</p>
      <p>
        {formatFuzzyDate(place.built)} – {formatFuzzyDate(place.demolished)} · {place.status}
      </p>
      {place.locationLabel && <p>{place.locationLabel}</p>}
      {buildings.length > 0 && (
        <section>
          <h3>Buildings</h3>
          <ul className="lot-list">
            {buildings.map((building) => (
              <li key={building.buildingId}>
                <div>
                  {formatBuildingSummary(building).map((line, index) => (
                    <p key={`${building.buildingId}-${line}`} className={index === 0 ? undefined : 'muted'}>
                      {line}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {lots.length > 0 && (
        <section>
          <h3>Parcels</h3>
          <ul className="lot-list">
            {lots.map((lot) => (
              <li key={lot.number}>
                <div>
                  {formatLotSummary(lot).map((line, index) => (
                    <p key={`${lot.number}-${line}`} className={index === 0 ? undefined : 'muted'}>
                      {line}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {place.notes && <p className="notes">{place.notes}</p>}
      <LinkSection title="Sources" links={place.sources} />
      <LinkSection title="Images" links={place.images ?? []} />

      <section>
        <h3>Same site</h3>
        {site.length <= 1 ? (
          <p className="muted">No other recorded places on this site</p>
        ) : (
          <ol>
            {site.map((id) => {
              const item = places.find((candidate) => candidate.id === id)
              const label = item
                ? `${primaryName(item)} (${formatFuzzyDate(item.built)} – ${formatFuzzyDate(item.demolished)})`
                : id
              return (
                <li key={id}>
                  {id === place.id ? (
                    <span>{label}</span>
                  ) : (
                    <button type="button" className="linkish" onClick={() => onSelect(id)}>
                      {label}
                    </button>
                  )}
                </li>
              )
            })}
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
        {onBack && (
          <button type="button" className="ghost" onClick={onBack}>
            Back to site
          </button>
        )}
        <button type="button" onClick={onEdit}>
          Edit
        </button>
      </div>
    </article>
  )
}

function LinkSection({ title, links }: { title: string; links: Source[] }) {
  if (!links.length) return null
  return (
    <section>
      <h3>{title}</h3>
      <ul className="ref-list">
        {links.map((link, index) => (
          <li key={`${link.url ?? ''}-${link.label ?? ''}-${index}`}>
            {link.url ? (
              <a href={link.url} title={link.url} target="_blank" rel="noreferrer">
                {linkText(link)}
              </a>
            ) : (
              linkText(link)
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
