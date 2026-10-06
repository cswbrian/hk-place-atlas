import { describe, expect, it } from 'vitest'
import {
  photoDraftAllowsPaging,
  photoDraftCanFinish,
  photoDraftCloseKind,
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
