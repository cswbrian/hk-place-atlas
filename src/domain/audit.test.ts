import { describe, expect, it } from 'vitest'
import { parseAuditRow, revertPlan, type AuditEntry } from './audit'
import type { Feature } from './feature'

const cafe: Feature = {
  id: 'wiki-1',
  kind: 'shop',
  slug: 'cafe-1990',
  nameEn: 'Cafe',
  nameZh: '',
  status: 'standing',
  start: { year: 1990 },
  end: null,
  lng: 114.17,
  lat: 22.3,
  body: { notes: 'hi', sources: [], images: [], tags: [], customFields: [] },
  touched: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
}

const renamed: Feature = { ...cafe, nameEn: 'Cafe Renamed', updatedAt: '2026-01-03T00:00:00.000Z' }

const seed: Feature = { ...cafe, id: 'bdbiar-1', slug: 'house-1981', nameEn: 'House', kind: 'establishment' }

function entry(partial: Partial<AuditEntry> & Pick<AuditEntry, 'action'>): AuditEntry {
  return {
    id: 'aud-1',
    at: '2026-01-03T00:00:00.000Z',
    actorEmail: 'a@b.co',
    entityId: cafe.id,
    before: null,
    after: null,
    ...partial,
  }
}

describe('parseAuditRow', () => {
  it('reads a put snapshot pair', () => {
    const parsed = parseAuditRow({
      id: 'aud-1',
      at: cafe.updatedAt,
      actor_email: 'a@b.co',
      action: 'put',
      entity_id: cafe.id,
      before_json: JSON.stringify(cafe),
      after_json: JSON.stringify(renamed),
    })
    expect(parsed).toMatchObject({ action: 'put', entityId: 'wiki-1' })
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.before?.nameEn).toBe('Cafe')
    expect(parsed.after?.nameEn).toBe('Cafe Renamed')
  })
})

describe('revertPlan', () => {
  it('restores the before snapshot of an edit', () => {
    expect(revertPlan(entry({ action: 'put', before: cafe, after: renamed }))).toEqual({
      type: 'restore',
      feature: cafe,
    })
  })

  it('deletes a wiki row when reverting its create', () => {
    expect(revertPlan(entry({ action: 'put', before: null, after: cafe }))).toEqual({ type: 'delete', feature: cafe })
  })

  it('refuses to delete a seed catalog row', () => {
    expect(revertPlan(entry({ action: 'put', before: null, after: seed, entityId: seed.id }))).toMatchObject({
      error: 'seed rows cannot be deleted',
    })
  })

  it('restores a deleted wiki feature', () => {
    expect(revertPlan(entry({ action: 'delete', before: cafe, after: null }))).toEqual({
      type: 'restore',
      feature: cafe,
    })
  })
})
