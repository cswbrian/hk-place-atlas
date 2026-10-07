import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCounts, fetchRecent } from './features'

describe('fetchCounts', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads place and photo totals', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ places: 12, photos: 3 })))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchCounts()).resolves.toEqual({ places: 12, photos: 3 })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/counts')
  })
})

describe('fetchRecent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the recent updates list', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ features: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await fetchRecent()
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/recent')
  })
})
