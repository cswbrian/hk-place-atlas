export type Session = {
  sub: string
  email: string
  exp: number
}

export const SESSION_COOKIE = 'atlas_session'
export const OAUTH_COOKIE = 'atlas_oauth'

function b64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return b64url(new Uint8Array(sig))
}

export function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=') || ''
  }
  return null
}

export async function signSession(session: Session, secret: string): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(session)))
  const signature = await hmac(secret, payload)
  return `${payload}.${signature}`
}

export async function readSession(token: string | null, secret: string): Promise<Session | null> {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = await hmac(secret, payload)
  if (signature.length !== expected.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i += 1) diff |= signature.charCodeAt(i)! ^ expected.charCodeAt(i)!
  if (diff !== 0) return null
  try {
    const session = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session
    if (!session.sub || !session.email || session.exp < Date.now() / 1000) return null
    return session
  } catch {
    return null
  }
}

export function setCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearCookie(name: string, secure: boolean): string {
  return setCookie(name, '', 0, secure)
}
