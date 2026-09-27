import { describe, expect, it } from 'vitest'
import type { Feature } from '../src/domain/feature.ts'
import { featureInsertSql } from './featureSql.ts'

const feature: Feature = {
  id: "bdbiar-1",
  kind: 'establishment',
  slug: 'foo-1970',
  nameEn: "O'Brien Building",
  nameZh: '奧氏',
  status: 'standing',
  start: { year: 1970, month: 4, day: 28 },
  end: null,
  lng: 114.1,
  lat: 22.2,
  body: { notes: '', sources: [], images: [], tags: [], customFields: [] },
  touched: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('featureInsertSql', () => {
  it('escapes quotes and emits a delete-then-insert script', () => {
    const sql = featureInsertSql([feature])
    expect(sql.startsWith('DELETE FROM features;')).toBe(true)
    expect(sql).toContain("O''Brien Building")
    expect(sql).toContain("'奧氏'")
    expect(sql).toContain('114.1')
  })
})
