import { describe, expect, it } from 'vitest'
import { establishmentInBounds, querySite } from './querySite'
import type { BuildingSnapshot, LotSnapshot, Establishment } from './types'

const now = '2026-01-01T00:00:00.000Z'

function establishment(partial: Pick<Establishment, 'id'> & Partial<Establishment>): Establishment {
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
      establishments: [],
    })
    expect(site.buildings.map((item) => item.buildingId)).toEqual(['b1'])
    expect(site.lots.map((item) => item.number)).toEqual(['IL 1'])
  })

  it('includes places that share hit lots or contain the point, newest first', () => {
    const parcel = lot('IL 1', 114.15)
    const standing = establishment({
      id: 'now',
      geometry: parcel.geometry,
      lots: [parcel],
      status: 'standing',
      built: { year: 1980 },
    })
    const previous = establishment({
      id: 'then',
      geometry: { type: 'Point', coordinates: [114.1505, 22.2805] },
      lots: [parcel],
      status: 'demolished',
      built: { year: 1911 },
      demolished: { year: 1977 },
    })
    const elsewhere = establishment({
      id: 'away',
      geometry: { type: 'Point', coordinates: [114.2, 22.3] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.1505,
      lat: 22.2805,
      buildings: [],
      lots: [parcel],
      establishments: [standing, previous, elsewhere],
    })
    expect(site.establishmentIds).toEqual(['now', 'then'])
  })

  it('includes nearby point places within 25 m when nothing else hits', () => {
    const pin = establishment({
      id: 'pin',
      geometry: { type: 'Point', coordinates: [114.15, 22.28] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.15001,
      lat: 22.28001,
      buildings: [],
      lots: [],
      establishments: [pin],
    })
    expect(site.establishmentIds).toEqual(['pin'])
  })

  it('does not pull nearby pins when the click hits a lot polygon', () => {
    const parcel = lot('IL 1', 114.15)
    const standing = establishment({
      id: 'now',
      geometry: parcel.geometry,
      lots: [parcel],
      status: 'standing',
      built: { year: 1980 },
    })
    const neighbor = establishment({
      id: 'neighbor',
      geometry: { type: 'Point', coordinates: [114.1499, 22.2805] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.1501,
      lat: 22.2805,
      buildings: [],
      lots: [parcel],
      establishments: [standing, neighbor],
    })
    expect(site.establishmentIds).toEqual(['now'])
  })

  it('does not pull nearby pins when the click hits a building polygon', () => {
    const footprint = building('b1', 114.15)
    const claimed = establishment({
      id: 'tower',
      geometry: footprint.geometry,
      buildings: [footprint],
      status: 'standing',
      built: { year: 1973 },
    })
    const neighbor = establishment({
      id: 'next-door',
      geometry: { type: 'Point', coordinates: [114.1499, 22.2805] },
      status: 'standing',
    })
    const site = querySite({
      lng: 114.1501,
      lat: 22.2805,
      buildings: [footprint],
      lots: [],
      establishments: [claimed, neighbor],
    })
    expect(site.establishmentIds).toEqual(['tower'])
  })

  it('includes a pin that sits inside the hit polygon as the same site', () => {
    const footprint = building('b1', 114.15)
    const previous = establishment({
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
      establishments: [previous],
    })
    expect(site.establishmentIds).toEqual(['then'])
  })

  it('does not chain a lot-sharing predecessor out to nearby unrelated pins', () => {
    const parcel = lot('IL 1', 114.15)
    const standing = establishment({
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
      demolished: { year: 1977 },
    })
    const stray = establishment({
      id: 'stray',
      geometry: { type: 'Point', coordinates: [114.1504, 22.27995] },
      status: 'demolished',
    })
    const site = querySite({
      lng: 114.1501,
      lat: 22.2805,
      buildings: [],
      lots: [parcel],
      establishments: [standing, previous, stray],
    })
    expect(site.establishmentIds).toEqual(['now', 'then'])
  })

  it('returns an empty site when the click hits nothing', () => {
    const site = querySite({
      lng: 114.0,
      lat: 22.0,
      buildings: [],
      lots: [],
      establishments: [],
    })
    expect(site.buildings).toEqual([])
    expect(site.lots).toEqual([])
    expect(site.establishmentIds).toEqual([])
    expect(site).not.toHaveProperty('recordIds')
  })

  it('ignores unlocated places for map hits', () => {
    const unlocated = establishment({
      id: 'notes-only',
      geometry: null,
    })
    const site = querySite({
      lng: 114.15,
      lat: 22.28,
      buildings: [],
      lots: [],
      establishments: [unlocated],
    })
    expect(site.establishmentIds).toEqual([])
    expect(establishmentInBounds(null, { west: 114, south: 22, east: 115, north: 23 })).toBe(false)
  })
})
