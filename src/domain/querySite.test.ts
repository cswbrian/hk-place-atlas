import { describe, expect, it } from 'vitest'
import { placeInBounds, querySite } from './querySite'
import type { BuildingSnapshot, LotSnapshot, Place } from './types'

const now = '2026-01-01T00:00:00.000Z'

function place(partial: Pick<Place, 'id'> & Partial<Place>): Place {
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

function building(id: string, west: number): BuildingSnapshot {
  return {
    buildingId: id,
    blockType: 'T',
    geometry: lot('x', west).geometry,
  }
}

describe('querySite', () => {
  it('returns buildings and lots containing the click point', () => {
    const footprint = building('b1', 114.15)
    const parcel = lot('IL 1', 114.15)
    const site = querySite({
      lng: 114.1505,
      lat: 22.2805,
      buildings: [footprint],
      lots: [parcel],
      places: [],
      records: [],
    })
    expect(site.buildings.map((item) => item.buildingId)).toEqual(['b1'])
    expect(site.lots.map((item) => item.number)).toEqual(['IL 1'])
  })

  it('includes places that share hit lots or contain the point, newest first', () => {
    const parcel = lot('IL 1', 114.15)
    const standing = place({
      id: 'now',
      geometry: parcel.geometry,
      lots: [parcel],
      status: 'standing',
      built: { year: 1980 },
    })
    const previous = place({
      id: 'then',
      geometry: { type: 'Point', coordinates: [114.1505, 22.2805] },
      lots: [parcel],
      status: 'demolished',
      built: { year: 1911 },
      demolished: { year: 1977 },
    })
    const elsewhere = place({
      id: 'away',
      geometry: { type: 'Point', coordinates: [114.2, 22.3] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.1505,
      lat: 22.2805,
      buildings: [],
      lots: [parcel],
      places: [standing, previous, elsewhere],
      records: [],
    })
    expect(site.placeIds).toEqual(['now', 'then'])
  })

  it('includes nearby point places within 25 m when nothing else hits', () => {
    const pin = place({
      id: 'pin',
      geometry: { type: 'Point', coordinates: [114.15, 22.28] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.15001,
      lat: 22.28001,
      buildings: [],
      lots: [],
      places: [pin],
      records: [],
    })
    expect(site.placeIds).toEqual(['pin'])
  })

  it('does not pull nearby pins when the click hits a lot polygon', () => {
    const parcel = lot('IL 1', 114.15)
    const standing = place({
      id: 'now',
      geometry: parcel.geometry,
      lots: [parcel],
      status: 'standing',
      built: { year: 1980 },
    })
    const neighbor = place({
      id: 'neighbor',
      geometry: { type: 'Point', coordinates: [114.1499, 22.2805] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.1501,
      lat: 22.2805,
      buildings: [],
      lots: [parcel],
      places: [standing, neighbor],
      records: [],
    })
    expect(site.placeIds).toEqual(['now'])
  })

  it('does not pull nearby pins when the click hits a building polygon', () => {
    const footprint = building('b1', 114.15)
    const claimed = place({
      id: 'tower',
      geometry: footprint.geometry,
      buildings: [footprint],
      status: 'standing',
      built: { year: 1973 },
    })
    const neighbor = place({
      id: 'next-door',
      geometry: { type: 'Point', coordinates: [114.1499, 22.2805] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.1501,
      lat: 22.2805,
      buildings: [footprint],
      lots: [],
      places: [claimed, neighbor],
      records: [],
    })
    expect(site.placeIds).toEqual(['tower'])
  })

  it('includes a pin that sits inside the hit polygon as the same site', () => {
    const footprint = building('b1', 114.15)
    const previous = place({
      id: 'then',
      geometry: { type: 'Point', coordinates: [114.1504, 22.2804] },
      status: 'demolished',
      built: { year: 1957 },
      demolished: { year: 1970 },
    })
    const site = querySite({
      lng: 114.1501,
      lat: 22.2805,
      buildings: [footprint],
      lots: [],
      places: [previous],
      records: [],
    })
    expect(site.placeIds).toEqual(['then'])
  })

  it('does not chain a lot-sharing predecessor out to nearby unrelated pins', () => {
    const parcel = lot('IL 1', 114.15)
    const standing = place({
      id: 'now',
      geometry: parcel.geometry,
      lots: [parcel],
      status: 'standing',
      built: { year: 1980 },
    })
    const previous = place({
      id: 'then',
      geometry: { type: 'Point', coordinates: [114.1504, 22.28015] },
      lots: [parcel],
      status: 'demolished',
      built: { year: 1911 },
      demolished: { year: 1977 },
    })
    const stray = place({
      id: 'stray',
      geometry: { type: 'Point', coordinates: [114.1504, 22.27995] },
      status: 'demolished',
    })
    const site = querySite({
      lng: 114.1501,
      lat: 22.2805,
      buildings: [],
      lots: [parcel],
      places: [standing, previous, stray],
      records: [],
    })
    expect(site.placeIds).toEqual(['now', 'then'])
  })

  it('returns an empty site when the click hits nothing', () => {
    const site = querySite({
      lng: 114.0,
      lat: 22.0,
      buildings: [],
      lots: [],
      places: [],
      records: [],
    })
    expect(site.buildings).toEqual([])
    expect(site.lots).toEqual([])
    expect(site.placeIds).toEqual([])
    expect(site.recordIds).toEqual([])
  })

  it('includes records linked to hit places or nearby pins', () => {
    const pin = place({
      id: 'pin',
      geometry: { type: 'Point', coordinates: [114.15, 22.28] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.15,
      lat: 22.28,
      buildings: [],
      lots: [],
      places: [pin],
      records: [
        {
          id: 'rec1',
          geometry: { type: 'Point', coordinates: [114.15001, 22.28001] },
          links: [{ kind: 'point' }],
        },
        {
          id: 'rec2',
          links: [{ kind: 'place', placeId: 'pin' }],
        },
        {
          id: 'rec3',
          links: [{ kind: 'place', placeId: 'elsewhere' }],
        },
      ],
    })
    expect(site.recordIds.sort()).toEqual(['rec1', 'rec2'])
  })

  it('ignores unlocated places for map hits', () => {
    const unlocated = place({
      id: 'notes-only',
      geometry: null,
    })
    const site = querySite({
      lng: 114.15,
      lat: 22.28,
      buildings: [],
      lots: [],
      places: [unlocated],
      records: [],
    })
    expect(site.placeIds).toEqual([])
    expect(placeInBounds(null, { west: 114, south: 22, east: 115, north: 23 })).toBe(false)
  })
})
