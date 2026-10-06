import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRecent } from './features'

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
