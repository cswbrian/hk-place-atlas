import { describe, expect, it } from 'vitest'
import type { BuildingSnapshot, LotSnapshot } from './types'
import { applyMapPick, type LocationDraft } from './mapPick'

const building: BuildingSnapshot = {
  buildingId: 'b1',
  blockType: 'T',
  nameEn: 'Jardine House',
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
}

const otherBuilding: BuildingSnapshot = {
  ...building,
  buildingId: 'b2',
  nameEn: 'Annex',
}

const lot: LotSnapshot = {
  number: 'IL 2319',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [114.149, 22.279],
      [114.152, 22.279],
      [114.152, 22.282],
      [114.149, 22.282],
      [114.149, 22.279],
    ]],
  },
}

const empty: LocationDraft = {
  buildings: [],
  lots: [],
  point: null,
  polygon: null,
}

describe('applyMapPick', () => {
  it('claims an unclaimed building and drops any point', () => {
    const current = { ...empty, point: [114.15, 22.28] as [number, number] }
    const next = applyMapPick(current, { lng: 114.1505, lat: 22.2805, buildings: [building] })
    expect(next.buildings).toEqual([building])
    expect(next.point).toBeNull()
    expect(next.polygon).toBeNull()
  })

  it('attaches a lot and drops any point', () => {
    const current = { ...empty, point: [114.15, 22.28] as [number, number] }
    const next = applyMapPick(current, { lng: 114.15, lat: 22.28, lots: [lot] })
    expect(next.lots).toEqual([lot])
    expect(next.point).toBeNull()
  })

  it('attaches both a building and a lot under the same click', () => {
    const next = applyMapPick(empty, {
      lng: 114.15,
      lat: 22.28,
      buildings: [building],
      lots: [lot],
    })
    expect(next.buildings).toEqual([building])
    expect(next.lots).toEqual([lot])
    expect(next.point).toBeNull()
  })

  it('uses a point when the click hits no polygon', () => {
    const next = applyMapPick(empty, { lng: 114.16, lat: 22.29 })
    expect(next).toEqual({
      buildings: [],
      lots: [],
      point: [114.16, 22.29],
      polygon: null,
    })
  })

  it('does not replace an existing polygon with an empty-map point', () => {
    const withBuilding = { ...empty, buildings: [building] }
    expect(applyMapPick(withBuilding, { lng: 114.16, lat: 22.29 })).toEqual(withBuilding)

    const withLot = { ...empty, lots: [lot] }
    expect(applyMapPick(withLot, { lng: 114.16, lat: 22.29 })).toEqual(withLot)

    const withOutline = {
      ...empty,
      polygon: [
        [114.15, 22.28],
        [114.151, 22.28],
        [114.151, 22.281],
      ] as [number, number][],
    }
    expect(applyMapPick(withOutline, { lng: 114.16, lat: 22.29 })).toEqual(withOutline)
  })

  it('borrows the outline when another place already claimed the building', () => {
    const next = applyMapPick(
      empty,
      { lng: 114.1505, lat: 22.2805, buildings: [building] },
      new Set(['b1']),
    )
    expect(next.buildings).toEqual([])
    expect(next.polygon).toEqual([
      [114.15, 22.28],
      [114.151, 22.28],
      [114.151, 22.281],
      [114.15, 22.281],
    ])
    expect(next.point).toBeNull()
  })

  it('does nothing when the building is already on this draft', () => {
    const current = { ...empty, buildings: [building] }
    expect(applyMapPick(current, { lng: 114.15, lat: 22.28, buildings: [building] })).toEqual(current)
  })

  it('claims an unclaimed building even if a sibling on the site is already claimed', () => {
    const next = applyMapPick(
      empty,
      { lng: 114.15, lat: 22.28, buildings: [building, otherBuilding] },
      new Set(['b2']),
    )
    expect(next.buildings).toEqual([building])
    expect(next.polygon).toBeNull()
  })
})
