import { describe, expect, it } from 'vitest'
import { featureStandingInYear, slugify, uniqueSlug } from './feature'

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

describe('featureStandingInYear', () => {
  const now = 2026

  it('hides an establishment after its end year', () => {
    expect(
      featureStandingInYear(
        { kind: 'establishment', start: { year: 1865 }, end: { year: 1921 } },
        1921,
        now,
      ),
    ).toBe(false)
    expect(
      featureStandingInYear(
        { kind: 'establishment', start: { year: 1865 }, end: { year: 1921 } },
        1920,
        now,
      ),
    ).toBe(true)
  })

  it('shows an event when the year overlaps its interval', () => {
    expect(
      featureStandingInYear(
        { kind: 'event', start: { year: 1941 }, end: { year: 1941 } },
        1941,
        now,
      ),
    ).toBe(true)
    expect(
      featureStandingInYear(
        { kind: 'event', start: { year: 1941 }, end: { year: 1941 } },
        1942,
        now,
      ),
    ).toBe(false)
  })
})
