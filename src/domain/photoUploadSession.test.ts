import { describe, expect, it } from 'vitest'
import {
  photoDraftAllowsPaging,
  photoDraftCanFinish,
  photoDraftCloseKind,
  photoDraftShouldPersistMeta,
} from './photoUploadSession'

describe('photoDraftCloseKind', () => {
  it('asks to discard when the upload draft is still open', () => {
    expect(photoDraftCloseKind(true)).toBe('confirm-discard')
  })

  it('closes normally after the draft is done', () => {
    expect(photoDraftCloseKind(false)).toBe('close')
  })
})

describe('photoDraftAllowsPaging', () => {
  it('blocks prev/next during the upload draft', () => {
    expect(photoDraftAllowsPaging(true)).toBe(false)
  })

  it('allows paging for an ordinary lightbox', () => {
    expect(photoDraftAllowsPaging(false)).toBe(true)
  })
})

describe('photoDraftCanFinish', () => {
  it('requires a pin for the upload place before Done', () => {
    expect(
      photoDraftCanFinish({
        placeFeatureId: 'place-1',
        tags: [{ featureId: 'other' }],
      }),
    ).toBe(false)
    expect(
      photoDraftCanFinish({
        placeFeatureId: 'place-1',
        tags: [{ featureId: 'place-1' }],
      }),
    ).toBe(true)
  })
})

describe('photoDraftShouldPersistMeta', () => {
  it('persists only when source and https URL are ready', () => {
    expect(
      photoDraftShouldPersistMeta({
        source: '',
        sourceUrl: '',
        year: '',
        circa: false,
      }),
    ).toBe(false)
    expect(
      photoDraftShouldPersistMeta({
        source: 'SCMP',
        sourceUrl: 'https://example.com/a',
        year: '',
        circa: false,
      }),
    ).toBe(true)
    expect(
      photoDraftShouldPersistMeta({
        source: 'SCMP',
        sourceUrl: 'https://example.com/a',
        year: '999',
        circa: false,
      }),
    ).toBe(false)
  })
})
