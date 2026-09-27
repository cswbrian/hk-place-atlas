import { describe, expect, it } from 'vitest'
import { featureInBbox, featureRowToFeature, parseBbox } from './featureQuery'
import type { Feature } from './feature'

describe('parseBbox', () => {
  it('parses west,south,east,north', () => {
    expect(parseBbox('114.1,22.2,114.2,22.3')).toEqual({
      west: 114.1,
      south: 22.2,
      east: 114.2,
      north: 22.3,
    })
  })

  it('rejects incomplete values', () => {
    expect(parseBbox('114.1,22.2')).toBeNull()
  })
})

describe('featureInBbox', () => {
  it('includes a point on the interior', () => {
    expect(featureInBbox(114.15, 22.28, { west: 114.1, south: 22.2, east: 114.2, north: 22.3 })).toBe(true)
  })

  it('excludes a null coordinate', () => {
    expect(featureInBbox(null, 22.28, { west: 114.1, south: 22.2, east: 114.2, north: 22.3 })).toBe(false)
  })
})

describe('featureRowToFeature', () => {
  it('round-trips a D1 row', () => {
    const row = {
      id: 'bdbiar-1',
      kind: 'establishment',
      slug: 'foo-1970',
      name_en: 'Foo',
      name_zh: '福',
      status: 'standing',
      start_year: 1970,
      start_month: 4,
      start_day: 28,
      start_circa: 0,
      end_year: null,
      end_month: null,
      end_day: null,
      end_circa: 0,
      lng: 114.1,
      lat: 22.2,
      body: JSON.stringify({ notes: '', sources: [], images: [], tags: [], customFields: [] }),
      touched: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      created_by: null,
      updated_by: null,
    }
    const feature: Feature = featureRowToFeature(row)
    expect(feature.start).toEqual({ year: 1970, month: 4, day: 28 })
    expect(feature.end).toBeNull()
    expect(feature.touched).toBe(false)
    expect(feature.nameZh).toBe('福')
  })
})
