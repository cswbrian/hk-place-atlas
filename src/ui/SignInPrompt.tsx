import { useEffect } from 'react'
import type { SignInPromptIntent } from '../domain/authIntent'
import { copy, type SiteLocale } from '../domain/locale'

type Props = {
  locale: SiteLocale
  intent: SignInPromptIntent
  signInHref: string
  onClose: () => void
}

function titleFor(intent: SignInPromptIntent, text: (typeof copy)[SiteLocale]): string {
  if (intent === 'contribute') return text.signInPromptContributeTitle
  if (intent === 'add') return text.signInPromptAddTitle
  if (intent === 'edit') return text.signInPromptEditTitle
  return text.signInPromptPhotoTitle
}

function GoogleMark() {
  return (
    <svg className="google-sign-in-mark" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export function SignInPrompt({ locale, intent, signInHref, onClose }: Props) {
  const text = copy[locale]
  const title = titleFor(intent, text)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="sign-in-prompt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-prompt-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sign-in-prompt-panel">
        <button
          type="button"
          className="sign-in-prompt-close"
          aria-label={text.close}
          title={text.close}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        </button>
        <h2 id="sign-in-prompt-title">{title}</h2>
        <p>{text.signInPromptBody}</p>
        <div className="sign-in-prompt-actions">
          <a className="google-sign-in" href={signInHref}>
            <GoogleMark />
            <span>{text.signInWithGoogle}</span>
          </a>
        </div>
      </div>
    </div>
  )
}
