import { describe, expect, it } from 'vitest'
import { LANDSD_ATTRIBUTION, landsDepartmentMapStyle } from './basemap'

const STYLE_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/basemap/WGS84/resources/styles/root.json'

describe('landsDepartmentMapStyle', () => {
  it('caps vector tiles at zoom 15 so the map overzooms instead of requesting empty tiles', () => {
    const style = landsDepartmentMapStyle({
      glyphs: '../fonts/{fontstack}/{range}.pbf',
      sources: {
        esri: { type: 'vector', url: '../../', maxzoom: 19 },
      },
      layers: [],
    })

    expect(style.sources.esri.maxzoom).toBe(15)
  })

  it('resolves style paths against the LandsD WGS84 style document', () => {
    const style = landsDepartmentMapStyle(
      {
        glyphs: '../fonts/{fontstack}/{range}.pbf',
        sprite: '../sprites/sprite',
        sources: {
          esri: { type: 'vector', url: '../../', maxzoom: 19, attribution: 'old' },
        },
        layers: [],
      },
      STYLE_URL,
    )

    expect(style.glyphs).toBe(
      'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/basemap/WGS84/resources/fonts/{fontstack}/{range}.pbf',
    )
    expect(style.sprite).toBe(
      'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/basemap/WGS84/resources/sprites/sprite',
    )
    expect(style.sources.esri.tiles).toEqual([
      'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/basemap/WGS84/tile/{z}/{y}/{x}.pbf',
    ])
    expect(style.sources.esri.url).toBeUndefined()
    expect(style.sources.esri.attribution).toBe('')
  })

  it('credits Lands Department', () => {
    expect(LANDSD_ATTRIBUTION).toContain('Map from Lands Department')
    expect(LANDSD_ATTRIBUTION).toContain('https://www.landsd.gov.hk/')
  })
})
