import { describe, expect, it } from 'vitest'
import { cookieValue, readSession, signSession } from './session'

describe('cookieValue', () => {
  it('reads a named cookie', () => {
    expect(cookieValue('a=1; atlas_session=abc; b=2', 'atlas_session')).toBe('abc')
    expect(cookieValue('a=1', 'atlas_session')).toBeNull()
  })
})

describe('signSession', () => {
  it('round-trips a signed session and rejects a tampered cookie', async () => {
    const secret = 'test-secret-test-secret-test-secret'
    const token = await signSession({ sub: 'google-1', email: 'a@b.co', exp: 9_999_999_999 }, secret)
    await expect(readSession(token, secret)).resolves.toEqual({
      sub: 'google-1',
      email: 'a@b.co',
      exp: 9_999_999_999,
    })
    await expect(readSession(`${token}x`, secret)).resolves.toBeNull()
  })
})
