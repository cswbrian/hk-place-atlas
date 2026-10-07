export const AUTH_INTENT_PARAM = 'authIntent'
export type AuthIntent = 'add' | 'edit' | 'photo'
/** Modal-only intent from the header Sign in control; no post-login resume. */
export type SignInPromptIntent = AuthIntent | 'contribute'

const INTENTS = new Set<AuthIntent>(['add', 'edit', 'photo'])

export function parseAuthIntent(search: string): AuthIntent | null {
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(
    AUTH_INTENT_PARAM,
  )
  return value && INTENTS.has(value as AuthIntent) ? (value as AuthIntent) : null
}

export function withAuthIntent(pathAndSearch: string, intent: AuthIntent): string {
  const url = new URL(pathAndSearch, 'https://atlas.local')
  url.searchParams.set(AUTH_INTENT_PARAM, intent)
  return `${url.pathname}${url.search}`
}

export function stripAuthIntent(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  params.delete(AUTH_INTENT_PARAM)
  const next = params.toString()
  return next ? `?${next}` : ''
}
