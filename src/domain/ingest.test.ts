import { describe, expect, it } from 'vitest'
import { ingestGaps, mergePlaceIngests } from './ingest'
import type { Place, Relation } from './types'

const now = '2026-09-15T00:00:00.000Z'

function place(partial: Pick<Place, 'id'> & Partial<Place>): Place {
  return {
    names: [{ lang: 'en', text: partial.id, primary: true }],
    status: 'unknown',
    built: null,
    demolished: null,
    geometry: { type: 'Point', coordinates: [114.15, 22.28] },
    notes: '',
    sources: [],
    images: [],
    tags: [],
    customFields: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

describe('ingestGaps', () => {
  it('does not flag demolished when the place is standing', () => {
    expect(ingestGaps({
      names: [
        { lang: 'en', text: 'Wheelock House', primary: true },
        { lang: 'zh-Hant', text: '會德豐大廈' },
      ],
      status: 'standing',
      built: { year: 1984 },
      demolished: null,
      geometry: { type: 'Point', coordinates: [114.1574, 22.2819] },
      locationLabel: 'Pedder Street, Central',
    })).toEqual([])
  })

  it('lists missing demolished date, pin, and Chinese name', () => {
    expect(ingestGaps({
      names: [{ lang: 'en', text: 'First Hong Kong Post Office', primary: true }],
      status: 'demolished',
      built: { year: 1841 },
      demolished: null,
      geometry: null,
      locationLabel: undefined,
    })).toEqual(['zh name', 'demolished', 'geometry', 'locationLabel'])
  })
})

describe('mergePlaceIngests', () => {
  it('inserts a place with null geometry and upserts relations', () => {
    const incoming = place({
      id: 'gwulo-6593',
      geometry: null,
      status: 'demolished',
    })
    const relation: Relation = {
      id: 'rel-gwulo-6593-inst',
      fromId: 'gwulo-6593',
      toId: 'gpo-queens-rd',
      type: 'institution_successor',
    }
    const merged = mergePlaceIngests(
      { places: [], records: [], relations: [] },
      [{ place: incoming, relations: [relation] }],
    )
    expect(merged.places[0]?.geometry).toBeNull()
    expect(merged.relations).toEqual([relation])
  })

  it('keeps claimed lots when the same id is ingested again', () => {
    const claimed = place({
      id: 'gpo-connaught',
      lots: [{
        number: 'IL 1',
        geometry: {
          type: 'Polygon',
          coordinates: [[[114.157, 22.281], [114.158, 22.281], [114.158, 22.282], [114.157, 22.282], [114.157, 22.281]]],
        },
      }],
    })
    const incoming = place({
      id: 'gpo-connaught',
      notes: 'From Gwulo',
      geometry: { type: 'Point', coordinates: [114.16, 22.28] },
    })
    const merged = mergePlaceIngests(
      { places: [claimed], records: [], relations: [] },
      [{ place: incoming, relations: [] }],
    )
    expect(merged.places[0]?.lots).toEqual(claimed.lots)
    expect(merged.places[0]?.geometry).toEqual(claimed.geometry)
    expect(merged.places[0]?.notes).toBe('From Gwulo')
    expect(merged.places[0]?.createdAt).toBe(now)
  })
})
