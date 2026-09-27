import { describe, expect, it } from 'vitest'
import { siteCluster } from './site'
import type { LotSnapshot, Establishment } from './types'

const now = '2026-01-01T00:00:00.000Z'

function establishment(partial: Pick<Establishment, 'id' | 'geometry'> & Partial<Establishment>): Establishment {
  return {
    names: [{ lang: 'en', text: partial.id, primary: true }],
    status: 'unknown',
    built: null,
    demolished: null,
    notes: '',
    sources: [],
    images: [],
    tags: [],
    customFields: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

function lot(number: string, west: number): LotSnapshot {
  return {
    number,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [west, 22.28],
        [west + 0.001, 22.28],
        [west + 0.001, 22.281],
        [west, 22.281],
        [west, 22.28],
      ]],
    },
  }
}

describe('siteCluster', () => {
  it('groups places that share a lot number, newest first', () => {
    const current = establishment({
      id: 'now',
      geometry: lot('IL 1', 114.15).geometry,
      lots: [lot('IL 1', 114.15)],
      status: 'standing',
      built: { year: 1980 },
    })
    const previous = establishment({
      id: 'then',
      geometry: lot('IL 1', 114.15).geometry,
      lots: [lot('IL 1', 114.15)],
      status: 'demolished',
      built: { year: 1920 },
      demolished: { year: 1979 },
    })
    const elsewhere = establishment({
      id: 'other',
      geometry: lot('IL 9', 114.2).geometry,
      lots: [lot('IL 9', 114.2)],
    })
    expect(siteCluster([current, previous, elsewhere], 'now')).toEqual(['now', 'then'])
  })

  it('groups identical nearby points without lots', () => {
    const connaught = establishment({
      id: 'gpo-connaught',
      geometry: { type: 'Point', coordinates: [114.1578, 22.283] },
    })
    const worldWide = establishment({
      id: 'world-wide-house',
      geometry: { type: 'Point', coordinates: [114.1578, 22.283] },
    })
    const queens = establishment({
      id: 'gpo-queens-rd',
      geometry: { type: 'Point', coordinates: [114.158, 22.2813] },
    })
    expect(siteCluster([connaught, worldWide, queens], 'gpo-connaught')).toEqual([
      'gpo-connaught',
      'world-wide-house',
    ])
  })

  it('does not group adjacent polygons that only sit next to each other', () => {
    const west = establishment({
      id: 'a',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [114.15, 22.28],
          [114.151, 22.28],
          [114.151, 22.281],
          [114.15, 22.281],
          [114.15, 22.28],
        ]],
      },
      buildings: [{
        buildingId: '1',
        blockType: 'T',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [114.15, 22.28],
            [114.151, 22.28],
            [114.151, 22.281],
            [114.15, 22.281],
            [114.15, 22.28],
          ]],
        },
      }],
    })
    const east = establishment({
      id: 'b',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [114.151, 22.28],
          [114.152, 22.28],
          [114.152, 22.281],
          [114.151, 22.281],
          [114.151, 22.28],
        ]],
      },
      buildings: [{
        buildingId: '2',
        blockType: 'T',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [114.151, 22.28],
            [114.152, 22.28],
            [114.152, 22.281],
            [114.151, 22.281],
            [114.151, 22.28],
          ]],
        },
      }],
    })
    expect(siteCluster([west, east], 'a')).toEqual(['a'])
  })

  it('does not chain a lot-sharing point out to nearby pins when nearbyPoints is off', () => {
    const parcel = lot('IL 1', 114.15)
    const current = establishment({
      id: 'now',
      geometry: parcel.geometry,
      lots: [parcel],
      status: 'standing',
      built: { year: 1980 },
    })
    const previous = establishment({
      id: 'then',
      geometry: { type: 'Point', coordinates: [114.1504, 22.28015] },
      lots: [parcel],
      status: 'demolished',
      built: { year: 1911 },
    })
    const stray = establishment({
      id: 'stray',
      geometry: { type: 'Point', coordinates: [114.1504, 22.27995] },
      status: 'demolished',
    })
    expect(siteCluster([current, previous, stray], 'now')).toEqual(['stray', 'now', 'then'])
    expect(siteCluster([current, previous, stray], 'now', { nearbyPoints: false })).toEqual([
      'now',
      'then',
    ])
  })

  it('does not chain dense BDBIAR pins by proximity alone', () => {
    const a = establishment({
      id: 'bdbiar-1',
      geometry: { type: 'Point', coordinates: [114.15, 22.28] },
      status: 'standing',
      customFields: [{ key: 'bdbiarId', value: '1' }],
    })
    const b = establishment({
      id: 'bdbiar-2',
      geometry: { type: 'Point', coordinates: [114.15001, 22.28001] },
      status: 'standing',
      customFields: [{ key: 'bdbiarId', value: '2' }],
    })
    expect(siteCluster([a, b], 'bdbiar-1')).toEqual(['bdbiar-1'])
  })

  it('does not cluster an unlocated place by coordinates', () => {
    const located = establishment({
      id: 'gpo',
      geometry: { type: 'Point', coordinates: [114.1578, 22.283] },
    })
    const unlocated = establishment({
      id: 'notes-only',
      geometry: null,
    })
    expect(siteCluster([located, unlocated], 'gpo')).toEqual(['gpo'])
    expect(siteCluster([located, unlocated], 'notes-only')).toEqual(['notes-only'])
  })
})
