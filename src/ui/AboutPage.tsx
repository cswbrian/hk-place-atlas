import { CONTACT_EMAIL, GITHUB_URL } from '../domain/legal'
import { copy, type SiteLocale } from '../domain/locale'
import { Button } from './Button'

function GitHubMark() {
  return (
    <svg className="about-github-mark" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}

export function AboutPage({
  locale,
  signedIn,
  authEnabled,
  onBack,
  onSignIn,
  onNavigate,
}: {
  locale: SiteLocale
  signedIn: boolean
  authEnabled: boolean
  onBack: () => void
  onSignIn: () => void
  onNavigate: (path: string) => void
}) {
  const text = copy[locale]
  const showSignIn = authEnabled && !signedIn
  const legalLink = (page: 'privacy' | 'terms', label: string) => (
    <a
      href={`/${locale}/${page}`}
      onClick={(event) => {
        event.preventDefault()
        onNavigate(`/${locale}/${page}`)
      }}
    >
      {label}
    </a>
  )
  return (
    <main id="about-page" className="about-page" lang={locale === 'hk' ? 'zh-Hant' : 'en'}>
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
          <Button onClick={onSignIn}>{text.aboutSignIn}</Button>
        ) : (
          <Button onClick={onBack}>{text.aboutBack}</Button>
        )}
      </p>
      <footer className="about-footer">
        <a className="about-github" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          <GitHubMark />
          <span>{text.githubContribute}</span>
        </a>
        <nav className="about-legal" aria-label={`${text.privacyNav} · ${text.termsNav}`}>
          {legalLink('privacy', text.privacyNav)}
          {legalLink('terms', text.termsNav)}
          <a href={`mailto:${CONTACT_EMAIL}`}>
            {text.contactLabel}: {CONTACT_EMAIL}
          </a>
        </nav>
      </footer>
    </main>
  )
}
