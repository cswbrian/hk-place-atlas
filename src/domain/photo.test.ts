import { describe, expect, it } from 'vitest'
import { mapThumbs, photoObjectKeys, photoUploadIssues, thumbPath } from './photo'

const place = {
  featureId: 'bdbiar-1',
  source: 'SCMP',
  remarks: 'Street front in 1972',
  sourceUrl: 'https://example.com/photo',
  byteLength: 1200,
  placeFound: true,
  placeLng: 114.15,
  placeLat: 22.28,
}

describe('photoUploadIssues', () => {
  it('accepts a photo attached to a place with a source, remarks, and https URL', () => {
    expect(photoUploadIssues(place)).toEqual([])
  })

  it('requires a place that has coordinates', () => {
    expect(photoUploadIssues({ ...place, featureId: '  ' })).toContain('place')
    expect(photoUploadIssues({ ...place, placeFound: false })).toContain('place')
    expect(photoUploadIssues({ ...place, placeLng: null, placeLat: null })).toContain('place')
  })

  it('accepts a photo with no remarks', () => {
    expect(photoUploadIssues({ ...place, remarks: '  ' })).toEqual([])
  })

  it('requires a source and an https source URL', () => {
    expect(photoUploadIssues({ ...place, source: '  ' })).toContain('source')
    expect(photoUploadIssues({ ...place, sourceUrl: 'http://example.com/a' })).toContain('sourceUrl')
    expect(photoUploadIssues({ ...place, sourceUrl: 'not a url' })).toContain('sourceUrl')
  })

  it('rejects an empty file and a file over 20 MB', () => {
    expect(photoUploadIssues({ ...place, byteLength: 0 })).toContain('file')
    expect(photoUploadIssues({ ...place, byteLength: 20 * 1024 * 1024 + 1 })).toContain('file')
  })
})

describe('photoObjectKeys', () => {
  it('keeps the original private and names the two public thumbnails', () => {
    expect(photoObjectKeys('pic-1')).toEqual({
      original: 'photos/pic-1/original',
      map: 'photos/pic-1/map.webp',
      panel: 'photos/pic-1/panel.webp',
    })
    expect(thumbPath('pic-1', 'map')).toBe('/api/photos/pic-1/thumb?size=map')
    expect(thumbPath('pic-1', 'panel')).toBe('/api/photos/pic-1/thumb?size=panel')
  })
})

describe('mapThumbs', () => {
  const photos = [
    { id: 'a', featureId: 'place-1', lng: 114.1, lat: 22.2 },
    { id: 'b', featureId: 'place-1', lng: 114.1, lat: 22.2 },
  ]

  it('hides thumbnails below street zoom', () => {
    expect(mapThumbs(photos, 16)).toEqual([])
  })

  it('shows one thumbnail beside a place and counts the rest', () => {
    const thumbs = mapThumbs(photos, 17)
    expect(thumbs).toEqual([{ id: 'a', featureId: 'place-1', lng: 114.1, lat: 22.2, count: 2 }])
  })

  it('keeps that single thumbnail when a place has more photos', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
      id,
      featureId: 'place-1',
      lng: 114.1,
      lat: 22.2,
    }))
    expect(mapThumbs(many, 17)).toEqual([
      { id: 'a', featureId: 'place-1', lng: 114.1, lat: 22.2, count: 5 },
    ])
  })
})
