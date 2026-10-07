import { describe, expect, it } from 'vitest'
import { AUTH_INTENT_PARAM, parseAuthIntent, stripAuthIntent, withAuthIntent } from './authIntent'

describe('authIntent', () => {
  it('parses add, edit, photo and rejects junk', () => {
    expect(parseAuthIntent('?authIntent=add')).toBe('add')
    expect(parseAuthIntent('?authIntent=edit')).toBe('edit')
    expect(parseAuthIntent('?foo=1&authIntent=photo')).toBe('photo')
    expect(parseAuthIntent('?authIntent=nope')).toBeNull()
    expect(parseAuthIntent('')).toBeNull()
  })

  it('adds intent to path+search without dropping other params', () => {
    expect(withAuthIntent('/en/place/foo?x=1', 'edit')).toBe(
      `/en/place/foo?x=1&${AUTH_INTENT_PARAM}=edit`,
    )
    expect(withAuthIntent('/en', 'add')).toBe(`/en?${AUTH_INTENT_PARAM}=add`)
  })

  it('strips intent and preserves other params', () => {
    expect(stripAuthIntent(`?${AUTH_INTENT_PARAM}=photo&x=1`)).toBe('?x=1')
    expect(stripAuthIntent(`?${AUTH_INTENT_PARAM}=add`)).toBe('')
  })
})
