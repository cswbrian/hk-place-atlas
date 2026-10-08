import { bilingualNames, catalogYear } from '../domain/dates'
import { copy, displayNames, type SiteLocale } from '../domain/locale'
import { formatBuildingSummary } from '../domain/lots'
import { compareSiteOrder } from '../domain/site'
import type { SiteQueryResult } from '../domain/querySite'
import type { Establishment } from '../domain/types'
import { Button } from './Button'

type Props = {
  site: SiteQueryResult
  establishments: Establishment[]
  onSelectEstablishment: (id: string) => void
  onEditEstablishment?: (establishment: Establishment) => void
  onAddEstablishment?: () => void
  locale?: SiteLocale
  labels?: {
    title: string
    empty: string
    add: string
  }
}

function indexYear(establishment: Establishment | null) {
  if (!establishment) return catalogYear(null)
  return catalogYear(establishment.built ?? establishment.demolished)
}

export function CatalogYearMark({
  text,
  circa,
  onActivate,
}: {
  text: string
  circa: boolean
  onActivate?: () => void
}) {
  const className = [
    'catalog-year',
    circa ? 'catalog-year-circa' : '',
    onActivate ? 'catalog-hit' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span
      className={className}
      aria-label={circa ? `circa ${text}` : undefined}
      onClick={onActivate}
    >
      {text}
    </span>
  )
}

export function CatalogRow({
  year,
  circa = false,
  title,
  zh,
  meta,
  onTitle,
  onEdit,
  editLabel,
  current = false,
}: {
  year: string
  circa?: boolean
  title: string
  zh?: string | null
  meta?: string | null
  onTitle?: () => void
  onEdit?: () => void
  editLabel?: string
  current?: boolean
}) {
  return (
    <li
      className={current ? 'catalog-row catalog-row-current' : 'catalog-row'}
      aria-current={current ? 'page' : undefined}
    >
      <CatalogYearMark text={year} circa={circa} onActivate={onTitle} />
      <div
        className={onTitle ? 'catalog-name catalog-hit' : 'catalog-name'}
        onClick={onTitle}
      >
        {onTitle ? (
          <Button
            variant="link"
            onClick={(event) => {
              event.stopPropagation()
              onTitle()
            }}
          >
            {title}
          </Button>
        ) : (
          <span>{title}</span>
        )}
        {zh ? <p className="zh">{zh}</p> : null}
        {meta ? <p className="muted">{meta}</p> : null}
      </div>
      {onEdit ? (
        <Button variant="link" onClick={onEdit}>
          {editLabel ?? 'Edit'}
        </Button>
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
  locale,
  labels,
}: Props) {
  const title = labels?.title ?? 'This site'
  const emptyLabel = labels?.empty ?? 'Nothing recorded here yet. Add a place at this pin.'
  const addLabel = labels?.add ?? 'Add place'
  const text = copy[locale ?? 'en']
  const siteEstablishments = site.establishmentIds
    .map((id) => establishments.find((establishment) => establishment.id === id))
    .filter((establishment): establishment is Establishment => Boolean(establishment))
    .sort(compareSiteOrder)
  const empty = siteEstablishments.length === 0 && site.buildings.length === 0
  const editLabel = text.edit

  return (
    <article className="detail site-panel" aria-label={title}>
      {siteEstablishments.length > 0 ? (
        <p className="muted">{text.sitePickPlace}</p>
      ) : null}

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
                  editLabel={editLabel}
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
          <Button onClick={onAddEstablishment}>{addLabel}</Button>
        </div>
      ) : null}
    </article>
  )
}
