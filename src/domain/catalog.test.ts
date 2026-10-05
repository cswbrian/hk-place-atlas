import { describe, expect, it } from 'vitest'
import { catalogFeatureToFeature, mergeOverlay } from './catalog'
import type { CatalogGeojson } from './catalog'

const collection: CatalogGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [114.1, 22.2] },
      properties: {
        id: 'a',
        slug: 'old-1865',
        kind: 'establishment',
        status: 'demolished',
        startYear: 1865,
        endYear: null,
        nameEn: 'Old',
        nameZh: '',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [114.2, 22.3] },
      properties: {
        id: 'b',
        slug: 'new-1970',
        kind: 'establishment',
        status: 'standing',
        startYear: 1970,
        endYear: null,
        nameEn: 'New',
        nameZh: '',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [114.15, 22.25] },
      properties: {
        id: 'c',
        slug: 'fair-1941',
        kind: 'event',
        status: 'unknown',
        startYear: 1941,
        endYear: 1941,
        nameEn: 'Fair',
        nameZh: '',
      },
    },
  ],
}

describe('catalogFeatureToFeature', () => {
  it('copies point coordinates onto a stub feature', () => {
    const feature = catalogFeatureToFeature(collection.features[1]!)
    expect(feature).toMatchObject({
      id: 'b',
      slug: 'new-1970',
      kind: 'establishment',
      lng: 114.2,
      lat: 22.3,
      start: { year: 1970 },
      end: null,
    })
  })
})

describe('mergeOverlay', () => {
  it('replaces a catalog pin with the wiki version and appends new pins', () => {
    const merged = mergeOverlay(collection, [
      {
        id: 'a',
        kind: 'establishment',
        slug: 'old-renamed',
        nameEn: 'Renamed',
        nameZh: '',
        status: 'standing',
        start: { year: 1865 },
        end: null,
        lng: 114.11,
        lat: 22.21,
        body: { notes: '', sources: [], images: [], tags: [], customFields: [] },
        touched: true,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'wiki-1',
        kind: 'shop',
        slug: 'cafe-1990',
        nameEn: 'Cafe',
        nameZh: '',
        status: 'standing',
        start: { year: 1990 },
        end: null,
        lng: 114.3,
        lat: 22.4,
        body: { notes: '', sources: [], images: [], tags: [], customFields: [] },
        touched: true,
        createdAt: '',
        updatedAt: '',
      },
    ])
    expect(merged.features.map((feature) => feature.properties.id).sort()).toEqual(['a', 'b', 'c', 'wiki-1'])
    expect(merged.features.find((feature) => feature.properties.id === 'a')?.properties.nameEn).toBe('Renamed')
  })
})
