import { describe, expect, it } from 'vitest'
import {
  catalogCountLine,
  copy,
  displayNames,
  featurePublicPath,
  parseFeaturePath,
  parseLocalePath,
  parsePlacesPath,
  placesPageRedirect,
  switchLocalePath,
} from './locale'

describe('parseLocalePath', () => {
  it('reads /en and /hk map roots', () => {
    expect(parseLocalePath('/en')).toEqual({ locale: 'en', rest: '/' })
    expect(parseLocalePath('/hk')).toEqual({ locale: 'hk', rest: '/' })
  })

  it('keeps a place slug under the locale prefix', () => {
    expect(parseLocalePath('/en/place/bonham-towers-88-bonham-rd-1970')).toEqual({
      locale: 'en',
      rest: '/place/bonham-towers-88-bonham-rd-1970',
    })
  })

  it('defaults a bare path to hk', () => {
    expect(parseLocalePath('/')).toEqual({ locale: 'hk', rest: '/' })
  })
})

describe('switchLocalePath', () => {
  it('swaps only the locale prefix', () => {
    expect(switchLocalePath('/en/place/foo-1970', 'hk')).toBe('/hk/place/foo-1970')
    expect(switchLocalePath('/en/places/foo', 'hk')).toBe('/hk/places/foo')
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

describe('placesPageRedirect', () => {
  it('sends the directory home to the map and a selected slug to the place page', () => {
    expect(placesPageRedirect('/en/places')).toBe('/en')
    expect(placesPageRedirect('/hk/places')).toBe('/hk')
    expect(placesPageRedirect('/en/places/jardine-house-1973')).toBe('/en/place/jardine-house-1973')
    expect(placesPageRedirect('/hk/places/jardine-house-1973')).toBe('/hk/place/jardine-house-1973')
    expect(placesPageRedirect('/en/place/jardine-house-1973')).toBeNull()
    expect(placesPageRedirect('/en')).toBeNull()
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
    expect(featurePublicPath('hk', 'shop', 'bar')).toBe('/hk/place/bar')
    expect(featurePublicPath('en', 'event', 'typhoon')).toBe('/en/event/typhoon')
  })
})

describe('displayNames', () => {
  it('leads with Chinese on the hk site', () => {
    expect(displayNames({ nameEn: 'Bonham Towers', nameZh: '般含閣' }, 'hk')).toEqual({
      title: '般含閣',
      secondary: 'Bonham Towers',
    })
  })
})

describe('catalogCountLine', () => {
  it('states how many places and photos are in the atlas', () => {
    expect(catalogCountLine(12, 3, 'en')).toBe('12 places, 3 photos, and growing.')
    expect(catalogCountLine(1, 1, 'en')).toBe('1 place, 1 photo, and growing.')
    expect(catalogCountLine(12, 3, 'hk')).toBe('12 個地點，3 張相片，共同記錄')
  })
})

describe('delete confirm copy', () => {
  it('asks before deleting a place or tag in both locales', () => {
    expect(copy.en.deletePlaceConfirm).toBe('Delete this place?')
    expect(copy.en.removeTagConfirm).toBe('Remove this tag?')
    expect(copy.hk.deletePlaceConfirm).toBe('刪除此地？')
    expect(copy.hk.removeTagConfirm).toBe('移除此標記？')
  })
})
