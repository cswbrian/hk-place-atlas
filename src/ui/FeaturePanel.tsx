import { featureAsEstablishment, type Feature } from '../domain/feature'
import { copy, type SiteLocale } from '../domain/locale'
import type { SiteQueryResult } from '../domain/querySite'
import { EstablishmentDetail } from './EstablishmentDetail'
import { SitePanel } from './SitePanel'
import type { AuditEntry, FeatureEdge } from '../api/features'

type Props = {
  locale: SiteLocale
  site: SiteQueryResult | null
  features: Feature[]
  selected: Feature | null
  edges: FeatureEdge[]
  onSelectSlug: (slug: string) => void
  onClose: () => void
  onBack?: () => void
  onAdd?: () => void
  onEdit?: () => void
  audit?: AuditEntry[]
  onRevert?: (id: string) => void
}

export function FeaturePanel({
  locale,
  site,
  features,
  selected,
  edges,
  onSelectSlug,
  onClose,
  onBack,
  onAdd,
  onEdit,
  audit = [],
  onRevert,
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
          relations={[]}
          onSelect={selectId}
          onBack={onBack}
          onEdit={onEdit}
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
        {audit.length > 0 ? (
          <section className="detail">
            <h3>{text.history}</h3>
            <ul className="ref-list">
              {audit.map((entry) => (
                <li key={entry.id}>
                  <span>
                    {entry.at.slice(0, 10)} · {entry.action} · {entry.actorEmail || 'wiki'}
                  </span>
                  {onRevert ? (
                    <button type="button" className="linkish" onClick={() => onRevert(entry.id)}>
                      {text.revert}
                    </button>
                  ) : null}
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
      <SitePanel
        site={site}
        establishments={establishments}
        onSelectEstablishment={selectId}
        onClose={onClose}
        onAddEstablishment={onAdd}
        locale={locale}
        labels={{
          title: text.thisSite,
          titleZh: text.thisSiteZh,
          close: text.close,
          empty: text.emptySite,
          add: text.add,
        }}
      />
    )
  }

  return (
    <div className="welcome">
      <h2>{text.title}</h2>
      <p>{text.tagline}</p>
      <p className="hint">{text.hint}</p>
      {onAdd ? (
        <button type="button" className="primary" onClick={onAdd}>
          {text.add}
        </button>
      ) : null}
    </div>
  )
}
