import { describe, expect, it } from 'vitest'
import { addLot, combineLotGeometry, lotNumbers, removeLot } from './lots'
import type { LotSnapshot } from './types'

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
