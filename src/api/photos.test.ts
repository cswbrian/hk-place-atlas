import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPhotos } from './photos'

describe('fetchPhotos', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks for photos of one place', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ photos: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await fetchPhotos({ featureId: 'bdbiar-1' })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/photos?featureId=bdbiar-1')
  })

  it('asks for photos inside the map view', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ photos: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await fetchPhotos({ bbox: { west: 114, south: 22, east: 114.2, north: 22.3 } })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/photos?bbox=114%2C22%2C114.2%2C22.3')
  })
})
