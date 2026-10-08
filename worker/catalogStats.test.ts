import { describe, expect, it } from 'vitest'
import {
  BUMP_CATALOG_STAT_SQL,
  READ_CATALOG_STATS_SQL,
  STAT_PHOTOS,
  STAT_PLACES,
  countsFromStatRows,
} from './catalogStats'

describe('countsFromStatRows', () => {
  it('maps places and photos keys', () => {
    expect(
      countsFromStatRows([
        { key: STAT_PLACES, value: 38503 },
        { key: STAT_PHOTOS, value: 10 },
      ]),
    ).toEqual({ places: 38503, photos: 10 })
  })

  it('defaults missing keys to zero', () => {
    expect(countsFromStatRows([])).toEqual({ places: 0, photos: 0 })
    expect(countsFromStatRows([{ key: STAT_PLACES, value: 3 }])).toEqual({ places: 3, photos: 0 })
  })
})

describe('catalog stats SQL', () => {
  it('reads only the known keys', () => {
    expect(READ_CATALOG_STATS_SQL).toContain('catalog_stats')
    expect(READ_CATALOG_STATS_SQL).toContain(STAT_PLACES)
    expect(READ_CATALOG_STATS_SQL).toContain(STAT_PHOTOS)
    expect(READ_CATALOG_STATS_SQL).not.toContain('COUNT(*)')
  })

  it('bumps a single key by delta', () => {
    expect(BUMP_CATALOG_STAT_SQL).toBe(
      'UPDATE catalog_stats SET value = value + ? WHERE key = ?',
    )
  })
})
