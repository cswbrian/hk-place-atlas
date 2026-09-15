import { describe, expect, it } from 'vitest'
import type { Place, Relation } from '../domain/types'
import { createMemoryStore } from './memoryStore'

const point = (id: string, name: string): Place => ({
  id,
  names: [{ lang: 'en', text: name, primary: true }],
  status: 'unknown',
  built: { year: 1900 },
  demolished: null,
  geometry: { type: 'Point', coordinates: [114.15, 22.28] },
  notes: '',
  sources: [],
  images: [],
  tags: [],
  customFields: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('createMemoryStore', () => {
  it('saves and lists places', async () => {
    const store = createMemoryStore()
    const place = point('p1', 'GPO')
    await store.savePlace(place)
    expect(await store.listPlaces()).toEqual([place])
    expect(await store.getPlace('p1')).toEqual(place)
  })

  it('saves places and relations together', async () => {
    const store = createMemoryStore()
    await store.savePlace(point('a', 'A'))
    await store.savePlace(point('b', 'B'))
    const relation: Relation = {
      id: 'r1',
      fromId: 'a',
      toId: 'b',
      type: 'site_successor',
    }
    await store.saveRelation(relation)
    expect(await store.listPlaces()).toHaveLength(2)
    expect(await store.listRelations()).toEqual([relation])
  })

  it('saves and lists records', async () => {
    const store = createMemoryStore()
    const record = {
      id: 'r1',
      title: 'Gwulo post',
      notes: '',
      urls: [{ label: 'Gwulo', url: 'https://gwulo.com/node/1' }],
      tags: [],
      links: [{ kind: 'place' as const, placeId: 'a' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    await store.saveRecord(record)
    expect(await store.listRecords()).toEqual([record])
  })
})
