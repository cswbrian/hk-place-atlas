import { describe, expect, it } from 'vitest'
import { openFreeMapBrightOptions } from './basemap'

describe('openFreeMapBrightOptions', () => {
  it('uses OpenFreeMap Bright and credits OpenFreeMap, OpenMapTiles, and OSM', () => {
    const options = openFreeMapBrightOptions()
    expect(options.style).toBe('https://tiles.openfreemap.org/styles/bright')
    expect(options.attribution).toContain('openfreemap.org')
    expect(options.attribution).toContain('openmaptiles.org')
    expect(options.attribution).toContain('openstreetmap.org/copyright')
  })
})
