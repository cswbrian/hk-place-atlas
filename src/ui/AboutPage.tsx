import { copy, type SiteLocale } from '../domain/locale'

export function AboutPage({
  locale,
  signedIn,
  authEnabled,
  onBack,
  onSignIn,
}: {
  locale: SiteLocale
  signedIn: boolean
  authEnabled: boolean
  onBack: () => void
  onSignIn: () => void
}) {
  const text = copy[locale]
  const showSignIn = authEnabled && !signedIn
  return (
    <main id="about-page" className="about-page" lang={locale === 'zh-hk' ? 'zh-Hant' : 'en'}>
      <h2>{text.aboutHeading}</h2>
      <p className="about-category">{text.category}</p>
      <p>{text.aboutLead}</p>
      <p>{text.aboutBody}</p>
      <p className="about-can">{text.aboutCan}</p>
      <ul>
        {text.aboutBullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="about-actions">
        {showSignIn ? (
          <button type="button" className="primary" onClick={onSignIn}>
            {text.aboutSignIn}
          </button>
        ) : (
          <button type="button" className="primary" onClick={onBack}>
            {text.aboutBack}
          </button>
        )}
      </p>
    </main>
  )
}
