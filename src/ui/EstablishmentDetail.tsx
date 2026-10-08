import { bilingualNames, catalogYear, formatFuzzyDate, primaryName } from '../domain/dates'
import { linkText } from '../domain/links'
import { copy, displayNames, type SiteLocale } from '../domain/locale'
import { formatBuildingSummary, formatLotSummary } from '../domain/lots'
import { siteCluster } from '../domain/site'
import type { Establishment, Source } from '../domain/types'
import { CatalogRow } from './SitePanel'
import type { ReactNode } from 'react'

type Props = {
  establishment: Establishment
  establishments: Establishment[]
  locale: SiteLocale
  photos?: ReactNode
  onEdit?: () => void
  onSelect: (id: string) => void
  onBack?: () => void
}

function dateSpan(built: Establishment['built'], demolished: Establishment['demolished']): string {
  const start = built ? formatFuzzyDate(built) : null
  const end = demolished ? formatFuzzyDate(demolished) : null
  if (start && end) return `${start} – ${end}`
  return start ?? end ?? '—'
}

export function EstablishmentDetail({
  establishment,
  establishments,
  locale,
  photos,
  onEdit,
  onSelect,
  onBack,
}: Props) {
  const text = copy[locale]
  const site = siteCluster(establishments, establishment.id)
  const lots = establishment.lots ?? []
  const buildings = establishment.buildings ?? []

  return (
    <article className="detail">
      {onBack || onEdit ? (
        <div className="detail-head">
          {onBack ? (
            <button
              type="button"
              className="ghost detail-back"
              aria-label={text.backToSite}
              title={text.backToSite}
              onClick={onBack}
            >
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
            </button>
          ) : null}
          {onEdit ? (
            <button type="button" className="detail-edit" onClick={onEdit}>
              {text.edit}
            </button>
          ) : null}
        </div>
      ) : null}
      <h2>{primaryName(establishment)}</h2>
      <p className="zh place-name">{establishment.names.find((name) => name.lang === 'zh-Hant')?.text}</p>
      <p>
        {dateSpan(establishment.built, establishment.demolished)}
        {establishment.status !== 'standing' ? ` · ${text[establishment.status]}` : ''}
      </p>
      {establishment.locationLabel && <p>{establishment.locationLabel}</p>}
      {photos}
      {establishment.notes && <p className="notes">{establishment.notes}</p>}

      <section>
        <h3>{text.sameSite}</h3>
        {site.length <= 1 ? (
          <p className="muted">{text.noOtherOnSite}</p>
        ) : (
          <ol className="catalog catalog-site">
            {site.map((id) => {
              const item = establishments.find((candidate) => candidate.id === id)
              if (!item) return <CatalogRow key={id} year="—" title={id} />
              const names = bilingualNames(item)
              const shown = displayNames({ nameEn: names.en, nameZh: names.zh ?? '' }, locale)
              const year = catalogYear(item.built ?? item.demolished)
              return (
                <CatalogRow
                  key={id}
                  year={year.text}
                  circa={year.circa}
                  title={shown.title}
                  zh={shown.secondary}
                  onTitle={id === establishment.id ? undefined : () => onSelect(id)}
                  current={id === establishment.id}
                />
              )
            })}
          </ol>
        )}
      </section>

      {buildings.length > 0 && (
        <section>
          <h3>{text.buildings}</h3>
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
          <h3>{text.parcels}</h3>
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
      <LinkSection title={text.sources} links={establishment.sources} />
      <LinkSection title={text.images} links={establishment.images ?? []} />
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
