import { describe, expect, it } from 'vitest'
import { formatBuildingSummary } from './lots'
import type { BuildingSnapshot } from './types'

describe('formatBuildingSummary', () => {
  it('names the footprint without podium/tower jargon', () => {
    const podium: BuildingSnapshot = {
      buildingId: '1',
      blockType: 'P',
      nameEn: 'Jardine House',
      nameZh: '怡和大廈',
      geometry: {
        type: 'Polygon',
        coordinates: [[[114, 22], [114.001, 22], [114.001, 22.001], [114, 22.001], [114, 22]]],
      },
    }
    expect(formatBuildingSummary(podium)).toEqual([
      'Jardine House',
      '怡和大廈',
      'ID 1',
    ])
  })
})
