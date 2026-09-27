import { describe, expect, it } from 'vitest'
import {
  CSDI_WFS,
  GIS_MAX_SPAN,
  LANDSD_ROOT,
  clampGisBbox,
  csdiBuildingsUrl,
  gisAroundPoint,
  landsdParcelUrl,
  landsdSearchUrl,
  parseParcelKind,
} from './gis'

describe('clampGisBbox', () => {
  it('rejects a bbox outside Hong Kong', () => {
    expect(clampGisBbox({ west: 0, south: 50, east: 1, north: 51 })).toBeNull()
  })

  it('shrinks a city-wide bbox around its centre', () => {
    const boxed = clampGisBbox({ west: 113.8, south: 22.15, east: 114.45, north: 22.58 })
    expect(boxed).not.toBeNull()
    expect(boxed!.east - boxed!.west).toBeLessThanOrEqual(GIS_MAX_SPAN + 1e-9)
    expect(boxed!.north - boxed!.south).toBeLessThanOrEqual(GIS_MAX_SPAN + 1e-9)
    expect((boxed!.west + boxed!.east) / 2).toBeCloseTo(114.125, 3)
  })
})

describe('gisAroundPoint', () => {
  it('pads a Sheung Wan click into a small WGS bbox', () => {
    const boxed = gisAroundPoint(114.15, 22.285)
    expect(boxed).toEqual({
      west: 114.148,
      south: 22.283,
      east: 114.152,
      north: 22.287,
    })
  })
})

describe('upstream URLs', () => {
  it('builds the CSDI Building WFS URL', () => {
    const url = new URL(
      csdiBuildingsUrl({ west: 114.148, south: 22.283, east: 114.152, north: 22.287 }),
    )
    expect(`${url.origin}${url.pathname}`).toBe(CSDI_WFS)
    expect(url.searchParams.get('request')).toBe('GetFeature')
    expect(url.searchParams.get('typeNames')).toBe('Building')
    expect(url.searchParams.get('outputFormat')).toBe('GEOJSON')
    expect(url.searchParams.get('bbox')).toBe('22.283,114.148,22.287,114.152,EPSG:4326')
    expect(url.searchParams.get('count')).toBe('500')
  })

  it('builds LandsD parcel and search URLs for allowlisted kinds only', () => {
    expect(parseParcelKind('lot')).toBe('lot')
    expect(parseParcelKind('GLA')).toBe('gla')
    expect(parseParcelKind('nope')).toBeNull()
    expect(landsdParcelUrl('lot', [832000, 815000, 832200, 815150])).toBe(
      `${LANDSD_ROOT}/gs/api/v1.0.0/iC1000/lot?bbox=832000,815000,832200,815150,EPSG:2326`,
    )
    expect(landsdSearchUrl('gla', 'GLA-HK-1')).toBe(
      `${LANDSD_ROOT}/gs/api/v1.0.0/lus/GLA/SearchNumber?text=GLA-HK-1`,
    )
  })
})
