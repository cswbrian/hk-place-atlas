import { describe, expect, it } from 'vitest'
import { bilingualNames, yearOnlyIfDefaultJan1 } from './dates'
import type { Place } from './types'

function place(names: Place['names']): Pick<Place, 'names'> {
  return { names }
}

describe('bilingualNames', () => {
  it('returns English and Chinese when both are present', () => {
    expect(bilingualNames(place([
      { lang: 'en', text: 'General Post Office (current)', primary: true },
      { lang: 'zh-Hant', text: '郵政總局（現址）' },
    ]))).toEqual({
      en: 'General Post Office (current)',
      zh: '郵政總局（現址）',
    })
  })

  it('omits Chinese when it is missing or the same as English', () => {
    expect(bilingualNames(place([
      { lang: 'en', text: 'World Wide House', primary: true },
    ]))).toEqual({ en: 'World Wide House', zh: null })

    expect(bilingualNames(place([
      { lang: 'en', text: 'Exchange Square', primary: true },
      { lang: 'zh-Hant', text: 'Exchange Square' },
    ]))).toEqual({ en: 'Exchange Square', zh: null })
  })
})

describe('yearOnlyIfDefaultJan1', () => {
  it('drops 1 January so Gwulo year-only dates stay year-only', () => {
    expect(yearOnlyIfDefaultJan1({ year: 1841, month: 1, day: 1 })).toEqual({ year: 1841 })
    expect(yearOnlyIfDefaultJan1({ year: 1977, month: 1, day: 1 })).toEqual({ year: 1977 })
  })

  it('keeps a real calendar day', () => {
    expect(yearOnlyIfDefaultJan1({ year: 1911, month: 6, day: 19 })).toEqual({
      year: 1911,
      month: 6,
      day: 19,
    })
  })
})
