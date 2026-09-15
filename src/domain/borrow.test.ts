import { describe, expect, it } from 'vitest'
import { borrowPolygonVertices } from './borrow'
import type { BuildingSnapshot } from './types'

const building: BuildingSnapshot = {
  buildingId: 'b1',
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
}

describe('borrowPolygonVertices', () => {
  it('copies the outer ring without claiming a building id', () => {
    expect(borrowPolygonVertices(building.geometry)).toEqual([
      [114.15, 22.28],
      [114.151, 22.28],
      [114.151, 22.281],
      [114.15, 22.281],
    ])
  })

  it('handles MultiPolygon by taking the first outer ring', () => {
    const multi = {
      type: 'MultiPolygon' as const,
      coordinates: [building.geometry.coordinates, building.geometry.coordinates],
    }
    expect(borrowPolygonVertices(multi)).toHaveLength(4)
  })
})
