import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SignInPrompt } from './SignInPrompt'

describe('SignInPrompt', () => {
  it('shows action-specific title, sign-in link, and close icon for add', () => {
    const html = renderToStaticMarkup(
      createElement(SignInPrompt, {
        locale: 'en',
        intent: 'add',
        signInHref: '/api/auth/google?return=%2Fen%3FauthIntent%3Dadd',
        onClose: () => {},
      }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Sign in to add a place')
    expect(html).toContain('Sign in with Google to add places, photos, and edits to HK Atlas.')
    expect(html).toContain('href="/api/auth/google?return=%2Fen%3FauthIntent%3Dadd"')
    expect(html).toContain('google-sign-in')
    expect(html).toContain('Sign in with Google')
    expect(html).toContain('sign-in-prompt-close')
    expect(html).toContain('aria-label="Close"')
    expect(html).not.toContain('Cancel')
  })

  it('uses contribute title for the shared header prompt', () => {
    const html = renderToStaticMarkup(
      createElement(SignInPrompt, {
        locale: 'en',
        intent: 'contribute',
        signInHref: '/api/auth/google?return=%2Fen',
        onClose: () => {},
      }),
    )
    expect(html).toContain('Sign in to contribute')
    expect(html).toContain('Sign in with Google to add places, photos, and edits to HK Atlas.')
  })

  it('uses edit and photo titles', () => {
    const edit = renderToStaticMarkup(
      createElement(SignInPrompt, {
        locale: 'en',
        intent: 'edit',
        signInHref: '/api/auth/google',
        onClose: () => {},
      }),
    )
    expect(edit).toContain('Sign in to edit')

    const photo = renderToStaticMarkup(
      createElement(SignInPrompt, {
        locale: 'en',
        intent: 'photo',
        signInHref: '/api/auth/google',
        onClose: () => {},
      }),
    )
    expect(photo).toContain('Sign in to add a photo')
  })
})
