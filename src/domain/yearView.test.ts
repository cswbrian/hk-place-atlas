import { describe, expect, it } from 'vitest'
import type { BuildingSnapshot, Place } from './types'
import { buildingVisibleInYear, placeStandingInYear } from './yearView'

const NOW = 2026

const building = (occupiedYear?: number): BuildingSnapshot => ({
  buildingId: '1',
  blockType: 'T',
  occupiedYear,
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
})

const place = (partial: Partial<Place> = {}): Place => ({
  id: 'p',
  names: [{ lang: 'en', text: 'Place', primary: true }],
  status: 'standing',
  built: null,
  demolished: null,
  geometry: { type: 'Point', coordinates: [114.15, 22.28] },
  notes: '',
  sources: [],
  images: [],
  tags: [],
  customFields: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...partial,
})

describe('buildingVisibleInYear', () => {
  it('shows a building from its occupation year onward', () => {
    const dated = building(1970)
    expect(buildingVisibleInYear(dated, 1969, NOW)).toBe(false)
    expect(buildingVisibleInYear(dated, 1970, NOW)).toBe(true)
    expect(buildingVisibleInYear(dated, NOW, NOW)).toBe(true)
  })

  it('shows undated buildings only at the current year', () => {
    const undated = building()
    expect(buildingVisibleInYear(undated, 1950, NOW)).toBe(false)
    expect(buildingVisibleInYear(undated, NOW, NOW)).toBe(true)
  })
})

describe('placeStandingInYear', () => {
  it('shows a place between built and demolished years', () => {
    const gpo = place({
      status: 'demolished',
      built: { year: 1865 },
      demolished: { year: 1921 },
    })
    expect(placeStandingInYear(gpo, 1864, NOW)).toBe(false)
    expect(placeStandingInYear(gpo, 1865, NOW)).toBe(true)
    expect(placeStandingInYear(gpo, 1920, NOW)).toBe(true)
    expect(placeStandingInYear(gpo, 1921, NOW)).toBe(false)
    expect(placeStandingInYear(gpo, NOW, NOW)).toBe(false)
  })

  it('shows a standing place from its built year through now', () => {
    const current = place({ built: { year: 1976 } })
    expect(placeStandingInYear(current, 1975, NOW)).toBe(false)
    expect(placeStandingInYear(current, 1976, NOW)).toBe(true)
    expect(placeStandingInYear(current, NOW, NOW)).toBe(true)
  })

  it('shows undated standing places only at the current year', () => {
    const undated = place({ built: null })
    expect(placeStandingInYear(undated, 1950, NOW)).toBe(false)
    expect(placeStandingInYear(undated, NOW, NOW)).toBe(true)
  })
})
