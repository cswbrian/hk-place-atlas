import { describe, expect, it } from 'vitest'
import { publicReadCacheSeconds } from './publicCache'

describe('publicReadCacheSeconds', () => {
  it('caches catalog reads that scan the place table', () => {
    expect(publicReadCacheSeconds({ type: 'search' }, 'GET')).toBe(6 * 60 * 60)
    expect(publicReadCacheSeconds({ type: 'recent' }, 'GET')).toBe(5 * 60)
    expect(publicReadCacheSeconds({ type: 'counts' }, 'GET')).toBe(5 * 60)
    expect(publicReadCacheSeconds({ type: 'sitemap' }, 'GET')).toBe(24 * 60 * 60)
  })

  it('leaves writes, sessions, and one-row lookups uncached', () => {
    expect(publicReadCacheSeconds({ type: 'search' }, 'POST')).toBeNull()
    expect(publicReadCacheSeconds({ type: 'feature', slug: 'cafe' }, 'GET')).toBeNull()
    expect(publicReadCacheSeconds({ type: 'feature', slug: 'cafe' }, 'PUT')).toBeNull()
    expect(publicReadCacheSeconds({ type: 'me' }, 'GET')).toBeNull()
    expect(publicReadCacheSeconds({ type: 'list' }, 'GET')).toBeNull()
    expect(publicReadCacheSeconds({ type: 'sitemap' }, 'HEAD')).toBeNull()
  })
})
