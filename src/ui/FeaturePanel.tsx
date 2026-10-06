import { featureAsEstablishment, type Feature, type FeatureKind } from '../domain/feature'
import { copy, displayNames, type SiteLocale } from '../domain/locale'
import { updatedAgo, yearSpan, type RecentItem } from '../domain/recent'
import type { SiteQueryResult } from '../domain/querySite'
import { EstablishmentDetail } from './EstablishmentDetail'
import { SitePanel } from './SitePanel'
import type { AuditEntry, FeatureEdge } from '../api/features'
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
  audit?: AuditEntry[] | null
  onShowHistory?: () => void
  onRevert?: (id: string) => void
  photos?: ReactNode
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
  audit = null,
  onShowHistory,
  onRevert,
  photos,
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
        />
        {photos}
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
        <section className="detail">
          {audit == null ? (
            <h3>
              <button type="button" className="linkish" onClick={onShowHistory}>
                {text.history}
              </button>
            </h3>
          ) : (
            <>
              <h3>{text.history}</h3>
              {audit.length === 0 ? (
                <p className="hint">{text.noHistory}</p>
              ) : (
                <ul className="ref-list">
                  {audit.map((entry) => (
                    <li key={entry.id}>
                      <span>
                        {entry.at.slice(0, 10)} ·{' '}
                        {entry.entityType === 'photo'
                          ? entry.action === 'delete'
                            ? text.photoRemoved
                            : text.photoAdded
                          : entry.action}{' '}
                        · {entry.actorEmail || 'wiki'}
                      </span>
                      {onRevert && entry.entityType !== 'photo' ? (
                        <button type="button" className="linkish" onClick={() => onRevert(entry.id)}>
                          {text.revert}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
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
            add: text.add,
          }}
        />
        {photos}
      </>
    )
  }

  return (
    <div className="welcome">
      <h2>{text.title}</h2>
      <p>{text.tagline}</p>
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
          {text.add}
        </button>
      ) : null}
    </div>
  )
}
