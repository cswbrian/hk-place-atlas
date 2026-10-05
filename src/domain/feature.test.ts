import { describe, expect, it } from 'vitest'
import { slugify, uniqueSlug } from './feature'

describe('slugify', () => {
  it('builds an ascii slug from an english name and year', () => {
    expect(slugify('BONHAM TOWERS 88 BONHAM RD', 1970)).toBe('bonham-towers-88-bonham-rd-1970')
  })

  it('falls back when the english name has no ascii letters', () => {
    expect(slugify('般含閣', 1970)).toBe('place-1970')
  })
})

describe('uniqueSlug', () => {
  it('suffixes colliding slugs', () => {
    const used = new Set(['bonham-towers-88-bonham-rd-1970'])
    expect(uniqueSlug('bonham-towers-88-bonham-rd-1970', used)).toBe('bonham-towers-88-bonham-rd-1970-2')
  })
})
