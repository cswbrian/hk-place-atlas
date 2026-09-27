import { describe, expect, it } from 'vitest'
import {
  displayNames,
  featurePublicPath,
  parseFeaturePath,
  parseLocalePath,
  parsePlacesPath,
  placesPublicPath,
  switchLocalePath,
} from './locale'

describe('parseLocalePath', () => {
  it('reads /en and /zh-hk map roots', () => {
    expect(parseLocalePath('/en')).toEqual({ locale: 'en', rest: '/' })
    expect(parseLocalePath('/zh-hk')).toEqual({ locale: 'zh-hk', rest: '/' })
  })

  it('keeps a place slug under the locale prefix', () => {
    expect(parseLocalePath('/en/place/bonham-towers-88-bonham-rd-1970')).toEqual({
      locale: 'en',
      rest: '/place/bonham-towers-88-bonham-rd-1970',
    })
  })

  it('defaults a bare path to English', () => {
    expect(parseLocalePath('/')).toEqual({ locale: 'en', rest: '/' })
  })
})

describe('switchLocalePath', () => {
  it('swaps only the locale prefix', () => {
    expect(switchLocalePath('/en/place/foo-1970', 'zh-hk')).toBe('/zh-hk/place/foo-1970')
    expect(switchLocalePath('/en/places/foo', 'zh-hk')).toBe('/zh-hk/places/foo')
  })
})

describe('parsePlacesPath', () => {
  it('reads the directory and a selected slug, and does not collide with /place/{slug}', () => {
    expect(parsePlacesPath('/places')).toEqual({ slug: null })
    expect(parsePlacesPath('/places/jardine-house-1973')).toEqual({ slug: 'jardine-house-1973' })
    expect(parsePlacesPath('/place/jardine-house-1973')).toBeNull()
    expect(parsePlacesPath('/')).toBeNull()
  })
})

describe('placesPublicPath', () => {
  it('builds directory URLs and omits default browse params', () => {
    expect(placesPublicPath('en')).toBe('/en/places')
    expect(placesPublicPath('zh-hk', 'jardine-house-1973')).toBe('/zh-hk/places/jardine-house-1973')
    expect(placesPublicPath('en', null, { letter: 'J', page: 2 })).toBe('/en/places?letter=J&page=2')
    expect(placesPublicPath('en', 'foo', { page: 1 })).toBe('/en/places/foo')
  })
})

describe('parseFeaturePath', () => {
  it('reads occupancy and event slugs', () => {
    expect(parseFeaturePath('/place/foo-1970')).toEqual({ group: 'place', slug: 'foo-1970' })
    expect(parseFeaturePath('/event/typhoon')).toEqual({ group: 'event', slug: 'typhoon' })
    expect(parseFeaturePath('/')).toBeNull()
  })
})

describe('featurePublicPath', () => {
  it('puts occupancy kinds under /place and events under /event', () => {
    expect(featurePublicPath('en', 'establishment', 'foo-1970')).toBe('/en/place/foo-1970')
    expect(featurePublicPath('zh-hk', 'shop', 'bar')).toBe('/zh-hk/place/bar')
    expect(featurePublicPath('en', 'event', 'typhoon')).toBe('/en/event/typhoon')
  })
})

describe('displayNames', () => {
  it('leads with Chinese on the zh-hk site', () => {
    expect(displayNames({ nameEn: 'Bonham Towers', nameZh: '般含閣' }, 'zh-hk')).toEqual({
      title: '般含閣',
      secondary: 'Bonham Towers',
    })
  })
})
