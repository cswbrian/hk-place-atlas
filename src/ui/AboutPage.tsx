import { copy, type SiteLocale } from '../domain/locale'

export function AboutPage({
  locale,
  onBack,
}: {
  locale: SiteLocale
  onBack: () => void
}) {
  const text = copy[locale]
  return (
    <main id="about-page" className="about-page" lang={locale === 'zh-hk' ? 'zh-Hant' : 'en'}>
      <h2>{text.aboutHeading}</h2>
      <p className="about-category">{text.category}</p>
      <p>{text.aboutLead}</p>
      <ul>
        {text.aboutBullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>{text.aboutDiffers}</p>
      <p>
        <a
          href={`/${locale}`}
          onClick={(event) => {
            event.preventDefault()
            onBack()
          }}
        >
          {text.aboutBack}
        </a>
      </p>
    </main>
  )
}
