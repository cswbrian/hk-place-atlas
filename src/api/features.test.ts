import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPlaces } from './features'

describe('fetchPlaces', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends region, district, and decade', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ page: 1, pageSize: 50, total: 0, features: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await fetchPlaces({
      locale: 'en',
      q: 'garden',
      region: 'kowloon',
      district: 'yau-tsim-mong',
      decade: 1980,
    })
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('region=kowloon')
    expect(url).toContain('district=yau-tsim-mong')
    expect(url).toContain('decade=1980')
    expect(url).toContain('q=garden')
  })
})
