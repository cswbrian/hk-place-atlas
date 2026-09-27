import { describe, expect, it } from 'vitest'
import { bilingualNames, catalogYear } from './dates'
import type { Establishment } from './types'

function establishment(names: Establishment['names']): Pick<Establishment, 'names'> {
  return { names }
}

describe('bilingualNames', () => {
  it('returns English and Chinese when both are present', () => {
    expect(bilingualNames(establishment([
      { lang: 'en', text: 'General Post Office (current)', primary: true },
      { lang: 'zh-Hant', text: '郵政總局（現址）' },
    ]))).toEqual({
      en: 'General Post Office (current)',
      zh: '郵政總局（現址）',
    })
  })

  it('omits Chinese when it is missing or the same as English', () => {
    expect(bilingualNames(establishment([
      { lang: 'en', text: 'World Wide House', primary: true },
    ]))).toEqual({ en: 'World Wide House', zh: null })

    expect(bilingualNames(establishment([
      { lang: 'en', text: 'Exchange Square', primary: true },
      { lang: 'zh-Hant', text: 'Exchange Square' },
    ]))).toEqual({ en: 'Exchange Square', zh: null })
  })
})

describe('catalogYear', () => {
  it('keeps the year digits only when the date is circa', () => {
    expect(catalogYear({ year: 1841, circa: true })).toEqual({ text: '1841', circa: true })
  })

  it('marks an exact year without a prefix', () => {
    expect(catalogYear({ year: 1908 })).toEqual({ text: '1908', circa: false })
  })

  it('uses an em dash when there is no date', () => {
    expect(catalogYear(null)).toEqual({ text: '—', circa: false })
    expect(catalogYear(undefined)).toEqual({ text: '—', circa: false })
  })
})
