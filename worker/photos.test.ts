import { describe, expect, it } from 'vitest'
import { createPhoto, removePhoto, type PhotoBucket } from './photos'

function memoryStore() {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>()
  const rows: unknown[] = []
  let inspections = 0
  let thumbs = 0
  const bucket: PhotoBucket = {
    async findPlace(id) {
      if (id === 'missing') return null
      if (id === 'no-point') return { id, lng: null, lat: null }
      return { id, lng: 114.15, lat: 22.28 }
    },
    async put(key, body, contentType) {
      objects.set(key, { body: new Uint8Array(body), contentType })
    },
    async delete(key) {
      objects.delete(key)
    },
    async insert(row) {
      rows.push(row)
    },
    async deleteRow() {
      rows.pop()
    },
    async inspect() {
      inspections += 1
      return inspections < 99
    },
    async thumbnail(_bytes, edge) {
      thumbs += 1
      if (edge === 960 && thumbs > 0 && failPanel) throw new Error('transform failed')
      return new Uint8Array([edge]).buffer
    },
  }
  let failPanel = false
  return {
    bucket,
    objects,
    rows,
    failPanel() {
      failPanel = true
    },
  }
}

const input = {
  id: 'pic-1',
  featureId: 'bdbiar-1',
  source: '',
  caption: '',
  photographer: '',
  license: '',
  year: '',
  circa: false,
  sourceUrl: '',
  bytes: new Uint8Array([1, 2, 3, 4]).buffer,
  createdAt: '2026-10-06T00:00:00.000Z',
  createdBy: 'user-1',
}

describe('createPhoto', () => {
  it('stores the original and both thumbnails for a placed photo', async () => {
    const store = memoryStore()
    const result = await createPhoto(store.bucket, input)
    expect(result).toMatchObject({
      ok: true,
      photo: {
        id: 'pic-1',
        featureId: 'bdbiar-1',
        lng: 114.15,
        lat: 22.28,
        source: '',
        caption: '',
        photographer: '',
        license: '',
        year: null,
        circa: false,
        sourceUrl: '',
        createdBy: 'user-1',
      },
    })
    expect([...store.objects.keys()].sort()).toEqual([
      'photos/pic-1/map.webp',
      'photos/pic-1/original',
      'photos/pic-1/panel.webp',
    ])
    expect(store.objects.get('photos/pic-1/map.webp')?.contentType).toBe('image/webp')
    expect(store.rows).toHaveLength(1)
  })

  it('rejects a missing place before writing objects', async () => {
    const store = memoryStore()
    const result = await createPhoto(store.bucket, { ...input, featureId: 'missing' })
    expect(result).toEqual({ ok: false, error: 'place' })
    expect(store.objects.size).toBe(0)
    expect(store.rows).toHaveLength(0)
  })

  it('deletes objects already written when a thumbnail fails', async () => {
    const store = memoryStore()
    store.failPanel()
    const result = await createPhoto(store.bucket, input)
    expect(result).toEqual({ ok: false, error: 'store' })
    expect(store.objects.size).toBe(0)
    expect(store.rows).toHaveLength(0)
  })
})

describe('removePhoto', () => {
  it('deletes the row and objects only for the author', async () => {
    const store = memoryStore()
    await store.bucket.put('photos/pic-1/original', new Uint8Array([1]).buffer, 'image/jpeg')
    const denied = await removePhoto(store.bucket, {
      id: 'pic-1',
      createdBy: 'user-1',
      originalKey: 'photos/pic-1/original',
      mapKey: 'photos/pic-1/map.webp',
      panelKey: 'photos/pic-1/panel.webp',
    }, 'someone-else')
    expect(denied).toBe('forbidden')
    expect(store.objects.has('photos/pic-1/original')).toBe(true)

    const removed = await removePhoto(store.bucket, {
      id: 'pic-1',
      createdBy: 'user-1',
      originalKey: 'photos/pic-1/original',
      mapKey: 'photos/pic-1/map.webp',
      panelKey: 'photos/pic-1/panel.webp',
    }, 'user-1')
    expect(removed).toBe('ok')
    expect(store.objects.size).toBe(0)
  })
})
