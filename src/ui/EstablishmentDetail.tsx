import { useState, type ReactNode } from 'react'
import { bilingualNames, catalogYear, formatFuzzyDate, primaryName } from '../domain/dates'
import { linkHostname } from '../domain/linkMeta'
import { linkText } from '../domain/links'
import { copy, displayNames, type SiteLocale } from '../domain/locale'
import { formatBuildingSummary, formatLotSummary } from '../domain/lots'
import { siteCluster } from '../domain/site'
import type { Establishment, Source } from '../domain/types'
import { Button } from './Button'
import { BackIcon } from './icons'
import { CatalogRow } from './SitePanel'

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
            <Button
              variant="ghost"
              className="detail-back"
              aria-label={text.backToSite}
              title={text.backToSite}
              onClick={onBack}
            >
              <BackIcon />
            </Button>
          ) : null}
          {onEdit ? (
            <Button className="detail-edit" onClick={onEdit}>
              {text.edit}
            </Button>
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

function GlobeIcon() {
  return (
    <svg className="ref-icon-fallback" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        d="M2 8h12M8 2c-2.2 1.8-3.2 3.8-3.2 6S5.8 12.2 8 14c2.2-1.8 3.2-3.8 3.2-6S10.2 3.8 8 2z"
      />
    </svg>
  )
}

function RefIcon({ src }: { src?: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return <GlobeIcon />
  return (
    <img
      className="ref-icon"
      src={src}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  )
}

function LinkSection({ title, links }: { title: string; links: Source[] }) {
  if (!links.length) return null
  return (
    <section>
      <h3>{title}</h3>
      <ul className="ref-list">
        {links.map((link, index) => {
          const titleText = linkText(link)
          const secondary = link.siteName?.trim() || (link.url ? linkHostname(link.url) : '')
          const body = (
            <>
              <RefIcon src={link.icon} />
              <span className="ref-text">
                <span className="ref-title">{titleText}</span>
                {secondary ? <span className="ref-site muted">{secondary}</span> : null}
              </span>
            </>
          )
          return (
            <li key={`${link.url ?? ''}-${link.label ?? ''}-${index}`}>
              {link.url ? (
                <a
                  className="ref-link"
                  href={link.url}
                  title={link.url}
                  target="_blank"
                  rel="nofollow ugc noopener noreferrer"
                >
                  {body}
                </a>
              ) : (
                <div className="ref-link">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
