import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HISTORY_MAP_ID,
  DEFAULT_HISTORY_OPACITY,
  HISTORY_MAP_MAX_Z,
  HISTORY_MAP_MIN_Z,
  HISTORY_MAPS,
  historyMapDatasetId,
  historyMapExportUrl,
  historyMapTileTemplate,
  isHistoryMapId,
  xyzToMercatorBbox,
} from './historyMap'

describe('historyMap', () => {
  it('lists the three v1 sheets with default central-1938', () => {
    expect(HISTORY_MAPS.map((m) => m.id)).toEqual([
      'central-1938',
      'victoria-1889',
      'victoria-1897',
    ])
    expect(DEFAULT_HISTORY_MAP_ID).toBe('central-1938')
    expect(DEFAULT_HISTORY_OPACITY).toBe(0.7)
    expect(historyMapDatasetId('central-1938')).toBe('landsd_rcd_1671592552706_20818')
    expect(historyMapDatasetId('victoria-1889')).toBe('landsd_rcd_1631586233937_28500')
    expect(historyMapDatasetId('victoria-1897')).toBe('landsd_rcd_1637714431413_44900')
  })

  it('guards sheet ids', () => {
    expect(isHistoryMapId('central-1938')).toBe(true)
    expect(isHistoryMapId('kowloon-1947')).toBe(false)
  })

  it('builds the MapLibre tile URL template', () => {
    expect(historyMapTileTemplate('central-1938')).toBe(
      '/api/history-map/central-1938/{z}/{x}/{y}.png',
    )
  })

  it('converts XYZ to Web Mercator bbox (z0 world)', () => {
    const bbox = xyzToMercatorBbox(0, 0, 0)
    expect(bbox.west).toBeCloseTo(-20037508.342789244, 3)
    expect(bbox.south).toBeCloseTo(-20037508.342789244, 3)
    expect(bbox.east).toBeCloseTo(20037508.342789244, 3)
    expect(bbox.north).toBeCloseTo(20037508.342789244, 3)
  })

  it('builds a CSDI export URL in EPSG:3857', () => {
    const url = historyMapExportUrl('landsd_rcd_1671592552706_20818', {
      west: 1,
      south: 2,
      east: 3,
      north: 4,
    })
    expect(url).toContain(
      'https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1671592552706_20818/MapServer/export?',
    )
    expect(url).toContain('bbox=1%2C2%2C3%2C4')
    expect(url).toContain('bboxSR=3857')
    expect(url).toContain('imageSR=3857')
    expect(url).toContain('size=256%2C256')
    expect(url).toContain('format=png32')
    expect(url).toContain('transparent=true')
    expect(url).toContain('f=image')
  })

  it('exposes atlas zoom bounds for the Worker', () => {
    expect(HISTORY_MAP_MIN_Z).toBe(9)
    expect(HISTORY_MAP_MAX_Z).toBe(19)
  })

  it('ships a PNG soft-fail tile', async () => {
    const { HISTORY_MAP_EMPTY_PNG } = await import('./historyMap')
    expect(HISTORY_MAP_EMPTY_PNG[0]).toBe(0x89)
    expect(HISTORY_MAP_EMPTY_PNG[1]).toBe(0x50)
    expect(HISTORY_MAP_EMPTY_PNG[2]).toBe(0x4e)
    expect(HISTORY_MAP_EMPTY_PNG[3]).toBe(0x47)
  })
})
