import { describe, expect, it } from 'vitest'
import {
  formatPhotoTaken,
  mapThumbs,
  mergeSitePhotos,
  normalizePhotoTaken,
  photoDetailText,
  photoDetailUrlHost,
  photoMetaComplete,
  photoMetaIssues,
  photoObjectKeys,
  photoUploadIssues,
  sortPhotosByTaken,
  thumbPath,
  type Photo,
} from './photo'

const place = {
  featureId: 'bdbiar-1',
  source: 'SCMP',
  caption: 'Street front in 1972',
  sourceUrl: 'https://example.com/photo',
  byteLength: 1200,
  placeFound: true,
  placeLng: 114.15,
  placeLat: 22.28,
}

describe('photoUploadIssues', () => {
  it('accepts a placed file with empty source metadata', () => {
    expect(
      photoUploadIssues({
        featureId: 'bdbiar-1',
        byteLength: 1200,
        placeFound: true,
        placeLng: 114.15,
        placeLat: 22.28,
      }),
    ).toEqual([])
  })

  it('requires a place that has coordinates', () => {
    expect(photoUploadIssues({ ...place, featureId: '  ' })).toContain('place')
    expect(photoUploadIssues({ ...place, placeFound: false })).toContain('place')
    expect(photoUploadIssues({ ...place, placeLng: null, placeLat: null })).toContain('place')
  })

  it('rejects an empty file and a file over 20 MB', () => {
    expect(photoUploadIssues({ ...place, byteLength: 0 })).toContain('file')
    expect(photoUploadIssues({ ...place, byteLength: 20 * 1024 * 1024 + 1 })).toContain('file')
  })

  it('rejects an out-of-range taken year', () => {
    expect(photoUploadIssues({ ...place, year: 999 })).toContain('year')
    expect(photoUploadIssues({ ...place, year: 2101 })).toContain('year')
  })
})

describe('photoMetaComplete', () => {
  it('needs a source name and https page URL', () => {
    expect(photoMetaComplete({ source: '', sourceUrl: '' })).toBe(false)
    expect(photoMetaComplete({ source: 'SCMP', sourceUrl: 'https://example.com/a' })).toBe(true)
  })
})

describe('normalizePhotoTaken', () => {
  it('keeps year empty and clears circa', () => {
    expect(normalizePhotoTaken({ year: '', circa: true })).toEqual({ year: null, circa: false })
    expect(normalizePhotoTaken({ year: null, circa: true })).toEqual({ year: null, circa: false })
  })

  it('accepts a year and optional circa', () => {
    expect(normalizePhotoTaken({ year: 1972, circa: false })).toEqual({ year: 1972, circa: false })
    expect(normalizePhotoTaken({ year: '1972', circa: true })).toEqual({ year: 1972, circa: true })
    expect(normalizePhotoTaken({ year: 1972, circa: 1 })).toEqual({ year: 1972, circa: true })
  })

  it('rejects non-integer or out-of-range years', () => {
    expect(normalizePhotoTaken({ year: '19.5' })).toEqual({ error: 'year' })
    expect(normalizePhotoTaken({ year: 999 })).toEqual({ error: 'year' })
  })
})

describe('formatPhotoTaken', () => {
  it('formats year and circa like place dates', () => {
    expect(formatPhotoTaken(null, false)).toBe(null)
    expect(formatPhotoTaken(1972, false)).toBe('1972')
    expect(formatPhotoTaken(1972, true)).toBe('c. 1972')
  })
})

describe('photoDetailText', () => {
  it('keeps text and shows a dash when empty', () => {
    expect(photoDetailText('陸博棋')).toBe('陸博棋')
    expect(photoDetailText('  ')).toBe('-')
    expect(photoDetailText(null)).toBe('-')
    expect(photoDetailText(undefined)).toBe('-')
  })
})

describe('photoDetailUrlHost', () => {
  it('shows the hostname instead of the full URL', () => {
    expect(
      photoDetailUrlHost(
        'https://www.facebook.com/photo/?fbid=1247593759068674&set=pcb.1012470235607042',
      ),
    ).toBe('www.facebook.com')
    expect(photoDetailUrlHost('')).toBe('-')
    expect(photoDetailUrlHost('not-a-url')).toBe('-')
  })
})

describe('photoMetaIssues', () => {
  it('accepts a source and https URL; caption and credits may be empty', () => {
    expect(
      photoMetaIssues({
        source: 'SCMP',
        caption: '',
        photographer: '',
        license: '',
        sourceUrl: 'https://example.com/a',
      }),
    ).toEqual([])
  })

  it('requires a source and an https source URL', () => {
    expect(
      photoMetaIssues({ source: '  ', caption: '', sourceUrl: 'https://example.com/a' }),
    ).toContain('source')
    expect(
      photoMetaIssues({ source: 'SCMP', caption: '', sourceUrl: 'http://example.com/a' }),
    ).toContain('sourceUrl')
  })

  it('rejects an invalid taken year', () => {
    expect(
      photoMetaIssues({
        source: 'SCMP',
        caption: '',
        sourceUrl: 'https://example.com/a',
        year: 999,
      }),
    ).toContain('year')
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

describe('mergeSitePhotos', () => {
  const sample = (id: string, featureId: string): Photo => ({
    id,
    featureId,
    lng: 114.1,
    lat: 22.2,
    source: 'SCMP',
    caption: '',
    photographer: '',
    license: '',
    year: null,
    circa: false,
    sourceUrl: 'https://example.com/a',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'user-1',
    tags: [],
  })

  it('keeps first-seen order and drops duplicate photo ids', () => {
    const shared = sample('pic-shared', 'place-1')
    expect(
      mergeSitePhotos([
        [shared, sample('pic-a', 'place-1')],
        [sample('pic-shared', 'place-2'), sample('pic-b', 'place-2')],
      ]).map((photo) => photo.id),
    ).toEqual(['pic-shared', 'pic-a', 'pic-b'])
  })

  it('returns an empty list when there are no place lists', () => {
    expect(mergeSitePhotos([])).toEqual([])
    expect(mergeSitePhotos([[], []])).toEqual([])
  })
})

describe('sortPhotosByTaken', () => {
  const sample = (id: string, year: number | null): Photo => ({
    id,
    featureId: 'place-1',
    lng: 114.1,
    lat: 22.2,
    source: 'SCMP',
    caption: '',
    photographer: '',
    license: '',
    year,
    circa: false,
    sourceUrl: 'https://example.com/a',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'user-1',
    tags: [],
  })

  it('orders dated photos early to late and keeps undated ones last in their order', () => {
    const photos = [sample('none-1', null), sample('y1972', 1972), sample('y1920a', 1920), sample('none-2', null), sample('y1920b', 1920)]
    expect(sortPhotosByTaken(photos).map((photo) => photo.id)).toEqual([
      'y1920a',
      'y1920b',
      'y1972',
      'none-1',
      'none-2',
    ])
    expect(photos[0]!.id).toBe('none-1')
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
