import { bilingualNames } from '../domain/dates'
import { formatBuildingSummary, formatLotSummary } from '../domain/lots'
import { compareSiteOrder } from '../domain/site'
import type { SiteQueryResult } from '../domain/querySite'
import type { AtlasRecord, Place } from '../domain/types'
import { linkText } from '../domain/links'

type Props = {
  site: SiteQueryResult
  places: Place[]
  records: AtlasRecord[]
  onEditPlace: (place: Place) => void
  onSelectPlace: (id: string) => void
  onAddPlace: () => void
  onAddRecord: () => void
  onClose: () => void
}

function indexYear(place: Place | null): string {
  if (!place) return '—'
  const date = place.built ?? place.demolished
  if (!date) return '—'
  return date.circa ? `c. ${date.year}` : String(date.year)
}

function CatalogRow({
  year,
  title,
  zh,
  meta,
  onTitle,
  onEdit,
}: {
  year: string
  title: string
  zh?: string | null
  meta?: string | null
  onTitle?: () => void
  onEdit?: () => void
}) {
  return (
    <li className="catalog-row">
      <span className="catalog-year">{year}</span>
      <div className="catalog-name">
        {onTitle ? (
          <button type="button" className="linkish" onClick={onTitle}>
            {title}
          </button>
        ) : (
          <span>{title}</span>
        )}
        {zh ? <p className="zh">{zh}</p> : null}
        {meta ? <p className="muted">{meta}</p> : null}
      </div>
      {onEdit ? (
        <button type="button" className="linkish" onClick={onEdit}>
          Edit
        </button>
      ) : (
        <span />
      )}
    </li>
  )
}

export function SitePanel({
  site,
  places,
  records,
  onEditPlace,
  onSelectPlace,
  onAddPlace,
  onAddRecord,
  onClose,
}: Props) {
  const sitePlaces = site.placeIds
    .map((id) => places.find((place) => place.id === id))
    .filter((place): place is Place => Boolean(place))
    .sort(compareSiteOrder)
  const siteRecords = site.recordIds
    .map((id) => records.find((record) => record.id === id))
    .filter((record): record is AtlasRecord => Boolean(record))
  const empty =
    sitePlaces.length === 0
    && site.buildings.length === 0
    && site.lots.length === 0
    && siteRecords.length === 0

  return (
    <article className="detail site-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>This site</h2>
        <button type="button" className="linkish" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="muted">
        {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
      </p>

      {empty && (
        <p className="hint">Nothing recorded here yet. Add a place or a record at this pin.</p>
      )}

      {(sitePlaces.length > 0 || site.buildings.length > 0) && (
      <ol className="catalog catalog-site">
        {sitePlaces.length > 0
          ? sitePlaces.map((place) => {
              const { en, zh } = bilingualNames(place)
              const location =
                place.locationLabel && place.locationLabel.trim() !== en.trim()
                  ? place.locationLabel
                  : null
              return (
                <CatalogRow
                  key={place.id}
                  year={indexYear(place)}
                  title={en}
                  zh={zh}
                  meta={location}
                  onTitle={() => onSelectPlace(place.id)}
                  onEdit={() => onEditPlace(place)}
                />
              )
            })
          : site.buildings.map((building) => {
              const lines = formatBuildingSummary(building)
              return (
                <CatalogRow
                  key={building.buildingId}
                  year="—"
                  title={lines[0] ?? building.buildingId}
                  meta={lines.slice(1).join(' · ') || 'No BDBIAR place yet'}
                />
              )
            })}
      </ol>
      )}

      {site.lots.length > 0 && (
        <section>
          <h3>Parcels</h3>
          <ul className="catalog catalog-plain">
            {site.lots.map((lot) => {
              const lines = formatLotSummary(lot)
              return (
                <li key={lot.number} className="catalog-row">
                  <div className="catalog-name">
                    <span>{lines[0]}</span>
                    {lines.slice(1).map((line) => (
                      <p key={line} className="muted">{line}</p>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h3>Records</h3>
        {siteRecords.length === 0 ? (
          <p className="muted">No records linked here</p>
        ) : (
          <ul className="catalog catalog-plain">
            {siteRecords.map((record) => (
              <li key={record.id} className="catalog-row">
                <div className="catalog-name">
                  <span>{record.title || 'Untitled record'}</span>
                  {record.urls[0]?.url && (
                    <p>
                      <a href={record.urls[0].url} target="_blank" rel="noreferrer">
                        {linkText(record.urls[0])}
                      </a>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="row">
        <button type="button" className="primary" onClick={onAddPlace}>
          Add place
        </button>
        <button type="button" className="ghost" onClick={onAddRecord}>
          Add record
        </button>
      </div>
    </article>
  )
}
