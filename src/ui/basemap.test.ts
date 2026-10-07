import { describe, expect, it } from 'vitest'
import {
  LANDSD_ATTRIBUTION,
  landsDepartmentMapStyle,
  landsdLabelLang,
  landsdLabelStyleUrl,
  mergeLandsDepartmentLabels,
} from './basemap'

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

describe('LandsD vector labels', () => {
  it('maps site locale to LandsD label language', () => {
    expect(landsdLabelLang('en')).toBe('en')
    expect(landsdLabelLang('hk')).toBe('tc')
  })

  it('builds the WGS84 label style URL for a language', () => {
    expect(landsdLabelStyleUrl('tc')).toBe(
      'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/tc/WGS84/resources/styles/root.json',
    )
    expect(landsdLabelStyleUrl('en')).toBe(
      'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/en/WGS84/resources/styles/root.json',
    )
  })

  it('merges label source/layers without clashing with basemap esri', () => {
    const basemap = landsDepartmentMapStyle(
      {
        version: 8,
        glyphs: '../fonts/{fontstack}/{range}.pbf',
        sprite: '../sprites/sprite',
        sources: { esri: { type: 'vector', url: '../../', maxzoom: 19 } },
        layers: [{ id: 'base-fill', type: 'fill', source: 'esri', paint: {} }],
      },
      STYLE_URL,
    )
    const labelUrl =
      'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/tc/WGS84/resources/styles/root.json'
    const labels = landsDepartmentMapStyle(
      {
        version: 8,
        glyphs: '../fonts/{fontstack}/{range}.pbf',
        sprite: 'https://example.com/label-sprite',
        sources: { esri: { type: 'vector', url: '../../', maxzoom: 19 } },
        layers: [
          {
            id: 'place-label',
            type: 'symbol',
            source: 'esri',
            layout: { 'text-field': 'name', 'text-font': ['CYanHeiHK Regular'] },
          },
        ],
      },
      labelUrl,
    )
    const merged = mergeLandsDepartmentLabels(basemap, labels)

    expect(merged.sources.esri).toEqual(basemap.sources.esri)
    expect(merged.sources['landsd-labels']).toEqual({
      type: 'vector',
      tiles: [
        'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/tc/WGS84/tile/{z}/{y}/{x}.pbf',
      ],
      maxzoom: 15,
      attribution: '',
    })
    expect(merged.sprite).toBe(basemap.sprite)
    expect(merged.glyphs).toBe(
      'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/tc/WGS84/resources/fonts/{fontstack}/{range}.pbf',
    )
    expect(merged.layers?.map((layer) => layer.id)).toEqual(['base-fill', 'place-label'])
    expect(merged.layers?.[1]).toMatchObject({ source: 'landsd-labels' })
  })
})
