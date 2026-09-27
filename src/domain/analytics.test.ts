import { describe, expect, it, vi, afterEach } from 'vitest'
import { trackPageview } from './analytics'

describe('trackPageview', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls gtag config with the measurement id and path', () => {
    const gtag = vi.fn()
    vi.stubGlobal('document', {
      querySelector: () => ({ getAttribute: () => 'G-NKVYYE1Y49' }),
    })
    vi.stubGlobal('window', { gtag })
    trackPageview('/en/place/cafe')
    expect(gtag).toHaveBeenCalledWith('config', 'G-NKVYYE1Y49', { page_path: '/en/place/cafe' })
  })

  it('no-ops without gtag or meta', () => {
    vi.stubGlobal('document', { querySelector: () => null })
    vi.stubGlobal('window', {})
    expect(() => trackPageview('/en')).not.toThrow()
  })
})
