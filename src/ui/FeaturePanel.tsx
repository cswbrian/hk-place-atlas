import { featureAsEstablishment, type Feature, type FeatureKind } from '../domain/feature'
import { catalogCountLine, copy, displayNames, type SiteLocale } from '../domain/locale'
import { updatedAgo, yearSpan, type RecentItem } from '../domain/recent'
import type { SiteQueryResult } from '../domain/querySite'
import { EstablishmentDetail } from './EstablishmentDetail'
import { SitePanel } from './SitePanel'
import type { FeatureEdge } from '../api/features'
import type { ReactNode } from 'react'

type Props = {
  locale: SiteLocale
  site: SiteQueryResult | null
  features: Feature[]
  selected: Feature | null
  edges: FeatureEdge[]
  recent?: RecentItem[]
  onSelectSlug: (slug: string, kind?: FeatureKind) => void
  onBack?: () => void
  onAdd?: () => void
  onEdit?: () => void
  photos?: ReactNode
  counts?: { places: number; photos: number } | null
}

export function FeaturePanel({
  locale,
  site,
  features,
  selected,
  edges,
  recent = [],
  onSelectSlug,
  onBack,
  onAdd,
  onEdit,
  photos,
  counts = null,
}: Props) {
  const text = copy[locale]
  const establishments = features.map(featureAsEstablishment)
  const selectId = (id: string) => {
    const hit = features.find((feature) => feature.id === id)
    if (hit) onSelectSlug(hit.slug)
  }

  if (selected) {
    return (
      <>
        <EstablishmentDetail
          establishment={featureAsEstablishment(selected)}
          establishments={establishments}
          locale={locale}
          onSelect={selectId}
          onBack={onBack}
          onEdit={onEdit}
          photos={photos}
        />
        {edges.length > 0 ? (
          <section className="detail">
            <h3>Links</h3>
            <ul className="ref-list">
              {edges.map((edge) => (
                <li key={edge.id}>
                  {edge.rel_type}: {edge.from_id} → {edge.to_id}
                  {edge.note ? ` (${edge.note})` : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    )
  }

  if (site) {
    return (
      <>
        <SitePanel
          site={site}
          establishments={establishments}
          onSelectEstablishment={selectId}
          onAddEstablishment={onAdd}
          locale={locale}
          labels={{
            title: text.thisSite,
            empty: text.emptySite,
            add: text.addPlace,
          }}
        />
        {photos}
      </>
    )
  }

  return (
    <div className="welcome">
      {counts ? <p>{catalogCountLine(counts.places, counts.photos, locale)}</p> : null}
      <p className="hint">{text.hint}</p>
      {recent.length > 0 ? (
        <section aria-label={text.recent}>
          <h3>{text.recent}</h3>
          <ul className="recent-list">
            {recent.map((item) => {
              const ago = updatedAgo(item.updatedAt, new Date(), locale)
              return (
                <li key={item.slug}>
                  <button type="button" className="linkish" onClick={() => onSelectSlug(item.slug, item.kind)}>
                    {displayNames(item, locale).title}
                  </button>
                  <span className="recent-meta">
                    {yearSpan(item)}
                    {ago ? ` · ${ago}` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
      {onAdd ? (
        <button type="button" className="primary" onClick={onAdd}>
          {text.addPlace}
        </button>
      ) : null}
    </div>
  )
}
