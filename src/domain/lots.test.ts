import { describe, expect, it } from 'vitest'
import {
  addBuilding,
  addLot,
  combineBuildingGeometry,
  combineLotGeometry,
  formatBuildingSummary,
  lotNumbers,
  placeByBuildingId,
  placeGeometry,
  removeBuilding,
  removeLot,
} from './lots'
import type { BuildingSnapshot, LotSnapshot } from './types'

const square = (x: number): LotSnapshot => ({
  number: `IL ${x}`,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [114 + x * 0.001, 22],
        [114 + x * 0.001 + 0.001, 22],
        [114 + x * 0.001 + 0.001, 22.001],
        [114 + x * 0.001, 22.001],
        [114 + x * 0.001, 22],
      ],
    ],
  },
})

const building = (id: string, x: number): BuildingSnapshot => ({
  buildingId: id,
  blockType: 'T',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [114 + x * 0.001, 22],
        [114 + x * 0.001 + 0.001, 22],
        [114 + x * 0.001 + 0.001, 22.001],
        [114 + x * 0.001, 22.001],
        [114 + x * 0.001, 22],
      ],
    ],
  },
})

describe('combineLotGeometry', () => {
  it('returns the single polygon when one lot is attached', () => {
    const lot = square(1)
    expect(combineLotGeometry([lot])).toEqual(lot.geometry)
  })

  it('returns a MultiPolygon when several lots are attached', () => {
    const a = square(1)
    const b = square(2)
    expect(combineLotGeometry([a, b])).toEqual({
      type: 'MultiPolygon',
      coordinates: [a.geometry.coordinates, b.geometry.coordinates],
    })
  })
})

describe('addLot / removeLot', () => {
  it('ignores a duplicate lot number', () => {
    const a = square(1)
    expect(addLot([a], { ...square(1), geometry: square(9).geometry })).toEqual([a])
  })

  it('appends a new lot', () => {
    const a = square(1)
    const b = square(2)
    expect(addLot([a], b)).toEqual([a, b])
  })

  it('removes by lot number', () => {
    const a = square(1)
    const b = square(2)
    expect(removeLot([a, b], 'IL 1')).toEqual([b])
  })
})

describe('lotNumbers', () => {
  it('reads numbers from attached lots', () => {
    expect(lotNumbers({ lots: [square(1), square(2)] })).toEqual(['IL 1', 'IL 2'])
  })

  it('is empty when no lots are attached', () => {
    expect(lotNumbers({})).toEqual([])
  })
})

describe('combineBuildingGeometry', () => {
  it('returns one polygon when a single building is attached', () => {
    const a = building('1', 1)
    expect(combineBuildingGeometry([a])).toEqual(a.geometry)
  })

  it('flattens MultiPolygon parts from several buildings', () => {
    const a = building('1', 1)
    const b: BuildingSnapshot = {
      buildingId: '2',
      blockType: 'P',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [115, 22],
              [115.001, 22],
              [115.001, 22.001],
              [115, 22.001],
              [115, 22],
            ],
          ],
        ],
      },
    }
    expect(combineBuildingGeometry([a, b])).toEqual({
      type: 'MultiPolygon',
      coordinates: [a.geometry.coordinates, b.geometry.coordinates[0]],
    })
  })
})

describe('placeGeometry', () => {
  it('prefers buildings over lots', () => {
    const b = building('1', 1)
    const lot = square(9)
    expect(placeGeometry([b], [lot], { type: 'Point', coordinates: [1, 2] })).toEqual(b.geometry)
  })

  it('uses lots when no buildings are attached', () => {
    const lot = square(1)
    expect(placeGeometry([], [lot], null)).toEqual(lot.geometry)
  })

  it('falls back to pin or draw', () => {
    const point = { type: 'Point' as const, coordinates: [114, 22] }
    expect(placeGeometry([], [], point)).toEqual(point)
  })
})

describe('placeByBuildingId', () => {
  it('finds the place that already attached a CSDI building', () => {
    const tower = building('5154972', 1)
    const place = {
      lots: [],
      buildings: [tower],
    }
    expect(placeByBuildingId([place], '5154972')).toBe(place)
    expect(placeByBuildingId([place], '999')).toBeUndefined()
  })
})

describe('addBuilding / removeBuilding', () => {
  it('ignores a duplicate building id', () => {
    const a = building('1', 1)
    expect(addBuilding([a], building('1', 9))).toEqual([a])
  })

  it('appends a new building', () => {
    const a = building('1', 1)
    const b = building('2', 2)
    expect(addBuilding([a], b)).toEqual([a, b])
  })

  it('removes by building id', () => {
    const a = building('1', 1)
    const b = building('2', 2)
    expect(removeBuilding([a, b], '1')).toEqual([b])
  })
})

describe('formatBuildingSummary', () => {
  it('names the footprint without podium/tower jargon', () => {
    const podium: BuildingSnapshot = {
      ...building('1', 1),
      blockType: 'P',
      nameEn: 'Jardine House',
      nameZh: '怡和大廈',
    }
    expect(formatBuildingSummary(podium)).toEqual([
      'Jardine House',
      '怡和大廈',
      'ID 1',
    ])
  })
})
