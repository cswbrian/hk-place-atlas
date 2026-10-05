import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { recentItemFromRow, recentListSql, shouldLoadRecent, updatedAgo, yearSpan } from './recent'

const now = new Date('2026-10-06T01:00:00.000Z')

describe('yearSpan', () => {
  it('joins the start and end years', () => {
    expect(yearSpan({ startYear: 1973, endYear: 1980 })).toBe('1973–1980')
    expect(yearSpan({ startYear: 1973, endYear: null })).toBe('1973–')
    expect(yearSpan({ startYear: null, endYear: 1980 })).toBe('–1980')
    expect(yearSpan({ startYear: null, endYear: null })).toBe('—')
  })
})

describe('updatedAgo', () => {
  it('describes how long ago a place was updated', () => {
    expect(updatedAgo('2026-10-06T00:59:30.000Z', now, 'en')).toBe('updated just now')
    expect(updatedAgo('2026-10-06T00:59:00.000Z', now, 'en')).toBe('updated 1 minute ago')
    expect(updatedAgo('2026-10-06T00:58:00.000Z', now, 'en')).toBe('updated 2 minutes ago')
    expect(updatedAgo('2026-10-06T00:00:00.000Z', now, 'en')).toBe('updated 1 hour ago')
    expect(updatedAgo('2026-10-05T23:00:00.000Z', now, 'en')).toBe('updated 2 hours ago')
    expect(updatedAgo('2026-10-05T01:00:00.000Z', now, 'en')).toBe('updated 1 day ago')
    expect(updatedAgo('2026-10-04T01:00:00.000Z', now, 'en')).toBe('updated 2 days ago')
    expect(updatedAgo('2026-08-01T00:00:00.000Z', now, 'en')).toBe('updated 1 Aug 2026')
  })

  it('uses Chinese labels', () => {
    expect(updatedAgo('2026-10-06T00:59:30.000Z', now, 'zh-hk')).toBe('剛剛更新')
    expect(updatedAgo('2026-10-06T00:58:00.000Z', now, 'zh-hk')).toBe('2 分鐘前更新')
    expect(updatedAgo('2026-10-05T23:00:00.000Z', now, 'zh-hk')).toBe('2 小時前更新')
    expect(updatedAgo('2026-10-04T01:00:00.000Z', now, 'zh-hk')).toBe('2 日前更新')
    expect(updatedAgo('2026-08-01T00:00:00.000Z', now, 'zh-hk')).toBe('2026年8月1日更新')
  })

  it('returns nothing when the stamp is missing or invalid', () => {
    expect(updatedAgo('', now, 'en')).toBe('')
    expect(updatedAgo('nope', now, 'en')).toBe('')
  })
})

describe('shouldLoadRecent', () => {
  it('loads on the idle map and skips a place that is already open', () => {
    expect(shouldLoadRecent({ onMap: true, selected: false, siteOpen: false, featurePath: false })).toBe(true)
    expect(shouldLoadRecent({ onMap: true, selected: false, siteOpen: false, featurePath: true })).toBe(false)
    expect(shouldLoadRecent({ onMap: true, selected: true, siteOpen: false, featurePath: false })).toBe(false)
    expect(shouldLoadRecent({ onMap: true, selected: false, siteOpen: true, featurePath: false })).toBe(false)
    expect(shouldLoadRecent({ onMap: false, selected: false, siteOpen: false, featurePath: false })).toBe(false)
  })
})

describe('recentListSql', () => {
  it('stops after the limit using the updated_at index', () => {
    const db = new DatabaseSync(':memory:')
    db.exec(`
      CREATE TABLE features (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        kind TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL DEFAULT '',
        lng REAL,
        lat REAL,
        start_year INTEGER,
        end_year INTEGER,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX features_updated ON features (updated_at DESC);
    `)
    const insert = db.prepare(
      `INSERT INTO features (id, slug, kind, name_en, name_zh, lng, lat, start_year, end_year, updated_at)
       VALUES (?, ?, 'establishment', 'Name', '', 114.1, 22.2, 1970, NULL, ?)`,
    )
    for (let i = 0; i < 40; i++) insert.run(`seed-${i}`, `seed-${String(i).padStart(2, '0')}`, '2026-01-01T00:00:00.000Z')
    insert.run('edited', 'zzz-edited', '2026-10-05T00:00:00.000Z')

    const sql = recentListSql()
    const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(5) as { detail: string }[]
    const detail = plan.map((row) => row.detail).join('\n')
    expect(detail).toContain('features_updated')
    expect(detail).not.toContain('USE TEMP B-TREE')

    const opcodes = (db.prepare(`EXPLAIN ${sql}`).all(5) as { opcode: string }[]).map((row) => row.opcode)
    const stop = opcodes.indexOf('DecrJumpZero')
    const next = opcodes.indexOf('Next', stop)
    expect(stop).toBeGreaterThan(-1)
    expect(next).toBeGreaterThan(stop)

    const rows = db.prepare(sql).all(5) as { slug: string; updated_at: string }[]
    expect(rows[0]?.slug).toBe('zzz-edited')
    expect(rows).toHaveLength(5)
  })
})

describe('recentItemFromRow', () => {
  it('maps a feature row into a recent list item', () => {
    expect(
      recentItemFromRow({
        slug: 'jardine-house-1973',
        kind: 'shop',
        name_en: 'Jardine House',
        name_zh: '怡和大廈',
        start_year: 1973,
        end_year: null,
        updated_at: '2026-10-04T01:00:00.000Z',
      }),
    ).toEqual({
      slug: 'jardine-house-1973',
      kind: 'shop',
      nameEn: 'Jardine House',
      nameZh: '怡和大廈',
      startYear: 1973,
      endYear: null,
      updatedAt: '2026-10-04T01:00:00.000Z',
    })
  })
})
