import { describe, expect, it } from 'vitest'
import { parseBuildingFeatureCollection } from './parseBuildingGeoJson'

const sample = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [114.16, 22.28],
              [114.161, 22.28],
              [114.161, 22.281],
              [114.16, 22.281],
              [114.16, 22.28],
            ],
          ],
        ],
      },
      properties: {
        BuildingID: 1103125246,
        BuildingBlockType: 'Tower',
        Status: 'Active',
        BuildingNameEN: 'Chater House',
        BuildingNameTC: '遮打大廈',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.17, 22.28],
            [114.171, 22.28],
            [114.171, 22.281],
            [114.17, 22.281],
            [114.17, 22.28],
          ],
        ],
      },
      properties: {
        BuildingID: 1810074915,
        BuildingBlockType: 'Podium',
        Status: 'Active',
        BuildingNameEN: null,
        BuildingNameTC: null,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.18, 22.28],
            [114.181, 22.28],
            [114.181, 22.281],
            [114.18, 22.281],
            [114.18, 22.28],
          ],
        ],
      },
      properties: {
        BuildingID: 99,
        BuildingBlockType: 'Temporary Structure',
        Status: 'Active',
        BuildingNameEN: 'Skip me',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.19, 22.28],
            [114.191, 22.28],
            [114.191, 22.281],
            [114.19, 22.281],
            [114.19, 22.28],
          ],
        ],
      },
      properties: {
        BuildingID: 100,
        BuildingBlockType: 'Tower',
        Status: 'Demolished',
        BuildingNameEN: 'Gone',
      },
    },
  ],
}

describe('parseBuildingFeatureCollection', () => {
  it('keeps active Tower and Podium footprints only', () => {
    const buildings = parseBuildingFeatureCollection(sample)
    expect(buildings).toHaveLength(2)
    expect(buildings[0]).toMatchObject({
      buildingId: '1103125246',
      blockType: 'T',
      nameEn: 'Chater House',
      nameZh: '遮打大廈',
    })
    expect(buildings[0].geometry.type).toBe('MultiPolygon')
    expect(buildings[1]).toMatchObject({
      buildingId: '1810074915',
      blockType: 'P',
    })
    expect(buildings[1].geometry.type).toBe('Polygon')
  })
})
