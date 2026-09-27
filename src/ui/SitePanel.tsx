import { bilingualNames, catalogYear } from '../domain/dates'
import { displayNames, type SiteLocale } from '../domain/locale'
import { formatBuildingSummary } from '../domain/lots'
import { compareSiteOrder } from '../domain/site'
import type { SiteQueryResult } from '../domain/querySite'
import type { Establishment } from '../domain/types'

type Props = {
  site: SiteQueryResult
  establishments: Establishment[]
  onSelectEstablishment: (id: string) => void
  onClose: () => void
  onEditEstablishment?: (establishment: Establishment) => void
  onAddEstablishment?: () => void
  locale?: SiteLocale
  labels?: {
    title: string
    titleZh: string
    close: string
    empty: string
    add: string
  }
}

function indexYear(establishment: Establishment | null) {
  if (!establishment) return catalogYear(null)
  return catalogYear(establishment.built ?? establishment.demolished)
}

export function CatalogYearMark({ text, circa }: { text: string; circa: boolean }) {
  return (
    <span
      className={circa ? 'catalog-year catalog-year-circa' : 'catalog-year'}
      aria-label={circa ? `circa ${text}` : undefined}
    >
      {text}
    </span>
  )
}

function CatalogRow({
  year,
  circa = false,
  title,
  zh,
  meta,
  onTitle,
  onEdit,
}: {
  year: string
  circa?: boolean
  title: string
  zh?: string | null
  meta?: string | null
  onTitle?: () => void
  onEdit?: () => void
}) {
  return (
    <li className="catalog-row">
      <CatalogYearMark text={year} circa={circa} />
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
  establishments,
  onEditEstablishment,
  onSelectEstablishment,
  onAddEstablishment,
  onClose,
  locale,
  labels,
}: Props) {
  const title = labels?.title ?? 'This site'
  const titleZh = labels?.titleZh ?? '此地'
  const closeLabel = labels?.close ?? 'Close'
  const emptyLabel = labels?.empty ?? 'Nothing recorded here yet. Add a place at this pin.'
  const addLabel = labels?.add ?? 'Add place'
  const siteEstablishments = site.establishmentIds
    .map((id) => establishments.find((establishment) => establishment.id === id))
    .filter((establishment): establishment is Establishment => Boolean(establishment))
    .sort(compareSiteOrder)
  const empty = siteEstablishments.length === 0 && site.buildings.length === 0

  return (
    <article className="detail site-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>
          {title} <span className="zh">{titleZh}</span>
        </h2>
        <button type="button" className="linkish" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
      <p className="muted">
        {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
      </p>

      {empty && (
        <p className="hint">{emptyLabel}</p>
      )}

      {(siteEstablishments.length > 0 || site.buildings.length > 0) && (
      <ol className="catalog catalog-site">
        {siteEstablishments.length > 0
          ? siteEstablishments.map((establishment) => {
              const { en, zh } = bilingualNames(establishment)
              const shown = locale
                ? displayNames({ nameEn: en, nameZh: zh ?? '' }, locale)
                : { title: en, secondary: zh }
              const location =
                establishment.locationLabel && establishment.locationLabel.trim() !== en.trim()
                  ? establishment.locationLabel
                  : null
              const { text, circa } = indexYear(establishment)
              return (
                <CatalogRow
                  key={establishment.id}
                  year={text}
                  circa={circa}
                  title={shown.title}
                  zh={shown.secondary}
                  meta={location}
                  onTitle={() => onSelectEstablishment(establishment.id)}
                  onEdit={onEditEstablishment ? () => onEditEstablishment(establishment) : undefined}
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

      {onAddEstablishment ? (
        <div className="row">
          <button type="button" className="primary" onClick={onAddEstablishment}>
            {addLabel}
          </button>
        </div>
      ) : null}
    </article>
  )
}
