import { describe, expect, it } from 'vitest'
import { districtBbox } from './districtView'
import { PLACE_REGIONS } from './placesFilters'

describe('districtBbox', () => {
  it('returns a box for every district chip', () => {
    for (const region of PLACE_REGIONS) {
      for (const district of region.districts) {
        const box = districtBbox(district.slug)
        expect(box, district.slug).not.toBeNull()
        expect(box!.west).toBeLessThan(box!.east)
        expect(box!.south).toBeLessThan(box!.north)
      }
    }
  })

  it('frames Yau Tsim Mong around Tsim Sha Tsui', () => {
    const box = districtBbox('yau-tsim-mong')
    expect(box).toEqual({
      west: 114.154,
      south: 22.295,
      east: 114.185,
      north: 22.326,
    })
  })

  it('returns null for an unknown district', () => {
    expect(districtBbox('macau')).toBeNull()
  })
})
