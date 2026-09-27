import { describe, expect, it } from 'vitest'
import {
  clampPage,
  nameEnLetter,
  parsePlacesListQuery,
  placesListItemFromRow,
  PLACES_PAGE_SIZE,
} from './placesQuery'

describe('nameEnLetter', () => {
  it('uses the first English letter, else #', () => {
    expect(nameEnLetter('Jardine House')).toBe('J')
    expect(nameEnLetter('  admiralty')).toBe('A')
    expect(nameEnLetter('88 Queensway')).toBe('#')
    expect(nameEnLetter('怡和大廈')).toBe('#')
    expect(nameEnLetter('')).toBe('#')
  })
})

describe('parsePlacesListQuery', () => {
  it('defaults page and pageSize, and drops letter while q is set', () => {
    expect(parsePlacesListQuery(new URLSearchParams(), 'en')).toEqual({
      page: 1,
      pageSize: PLACES_PAGE_SIZE,
      letter: null,
      q: null,
      locale: 'en',
    })
    const params = new URLSearchParams('page=2&letter=j&q=house&pageSize=999')
    expect(parsePlacesListQuery(params, 'zh-hk')).toEqual({
      page: 2,
      pageSize: 100,
      letter: null,
      q: 'house',
      locale: 'zh-hk',
    })
  })

  it('accepts A-Z and #, ignores other letters', () => {
    expect(parsePlacesListQuery(new URLSearchParams('letter=#'), 'en').letter).toBe('#')
    expect(parsePlacesListQuery(new URLSearchParams('letter=1'), 'en').letter).toBeNull()
  })
})

describe('clampPage', () => {
  it('clamps past-the-end pages onto the last page', () => {
    expect(clampPage(1, 0, 50)).toBe(1)
    expect(clampPage(9, 120, 50)).toBe(3)
    expect(clampPage(0, 120, 50)).toBe(1)
  })
})

describe('placesListItemFromRow', () => {
  it('maps a D1 row onto a list item', () => {
    expect(
      placesListItemFromRow({
        slug: 'jardine-house-1973',
        kind: 'establishment',
        name_en: 'Jardine House',
        name_zh: '怡和大廈',
        status: 'standing',
        start_year: 1973,
        end_year: null,
      }),
    ).toEqual({
      slug: 'jardine-house-1973',
      kind: 'establishment',
      nameEn: 'Jardine House',
      nameZh: '怡和大廈',
      status: 'standing',
      startYear: 1973,
      endYear: null,
    })
  })
})
