import { legal, type LegalPageId } from '../domain/legal'
import { copy, type SiteLocale } from '../domain/locale'

export function LegalPage({
  locale,
  page,
  onAbout,
}: {
  locale: SiteLocale
  page: LegalPageId
  onAbout: () => void
}) {
  const doc = legal[locale][page]
  const text = copy[locale]
  return (
    <main id="about-page" className="about-page legal-page" lang={locale === 'hk' ? 'zh-Hant' : 'en'}>
      <h2>{doc.heading}</h2>
      <p className="about-category">{doc.updated}</p>
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <p className="about-actions">
        <a
          href={`/${locale}/about`}
          onClick={(event) => {
            event.preventDefault()
            onAbout()
          }}
        >
          {text.aboutNav}
        </a>
      </p>
    </main>
  )
}
