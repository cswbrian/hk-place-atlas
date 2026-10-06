import { afterEach, describe, expect, it, vi } from 'vitest'
import { deletePhotoTag, fetchPhotos, originalPath, savePhotoTag, updatePhoto } from './photos'

describe('fetchPhotos', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks for photos of one place', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ photos: [{ id: 'pic-1' }] })))
    vi.stubGlobal('fetch', fetchMock)
    const photos = await fetchPhotos({ featureId: 'bdbiar-1' })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/photos?featureId=bdbiar-1')
    expect(photos[0]?.tags).toEqual([])
    expect(originalPath('pic-1')).toBe('/api/photos/pic-1/file')
  })

  it('asks for photos inside the map view', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ photos: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await fetchPhotos({ bbox: { west: 114, south: 22, east: 114.2, north: 22.3 } })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/photos?bbox=114%2C22%2C114.2%2C22.3')
  })

  it('saves and deletes a place pin', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return new Response(JSON.stringify({ ok: true }))
      return new Response(JSON.stringify({ id: 'tag-1', featureId: 'place-2', nameEn: 'Market', nameZh: '', slug: 'market', kind: 'establishment', x: 0.2, y: 0.4 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    await savePhotoTag({ photoId: 'pic-1', featureId: 'place-2', x: 0.2, y: 0.4 })
    await deletePhotoTag('pic-1', 'tag-1')
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/photos/pic-1/tags')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('/api/photos/pic-1/tags/tag-1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'DELETE' })
  })

  it('updates photo metadata', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'pic-1',
            source: 'SCMP',
            caption: 'note',
            photographer: 'Lee',
            license: 'CC BY 4.0',
            year: 1972,
            circa: true,
            sourceUrl: 'https://example.com/a',
            tags: [],
          }),
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    await updatePhoto({
      id: 'pic-1',
      source: 'SCMP',
      caption: 'note',
      photographer: 'Lee',
      license: 'CC BY 4.0',
      year: 1972,
      circa: true,
      sourceUrl: 'https://example.com/a',
    })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/photos/pic-1')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      caption: 'note',
      photographer: 'Lee',
      license: 'CC BY 4.0',
      year: 1972,
      circa: true,
    })
  })
})
