import { describe, expect, it } from 'vitest'
import { applyWikiWrite, checkIfMatch, parseFeatureWrite, rateLimitOk, wikiCanDelete } from './wiki'

describe('parseFeatureWrite', () => {
  it('accepts a shop pin and rejects a nameless write', () => {
    const parsed = parseFeatureWrite({
      kind: 'shop',
      nameEn: 'Cafe',
      nameZh: '咖啡',
      status: 'standing',
      start: { year: 1990 },
      end: null,
      lng: 114.17,
      lat: 22.3,
      body: { notes: 'hi', sources: [], images: [], tags: [], customFields: [] },
    })
    expect(parsed).toMatchObject({ kind: 'shop', nameEn: 'Cafe', lng: 114.17 })
    expect(parseFeatureWrite({ kind: 'shop', nameEn: '  ' })).toMatchObject({ error: 'name required' })
  })

  it('keeps http(s) sources with meta and drops unsafe urls', () => {
    const parsed = parseFeatureWrite({
      kind: 'establishment',
      nameEn: 'House',
      nameZh: '',
      status: 'standing',
      start: null,
      end: null,
      lng: null,
      lat: null,
      body: {
        notes: '',
        sources: [
          {
            label: '  Official page  ',
            url: 'https://example.com/a',
            siteName: 'Example',
            icon: 'https://example.com/favicon.ico',
          },
          { label: 'Bad', url: 'javascript:alert(1)' },
          { label: 'No url' },
          { url: 'http://ok.example/', icon: 'http://ok.example/icon.png' },
        ],
        images: [],
        tags: [],
        customFields: [],
      },
    })
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.body.sources).toEqual([
      {
        label: 'Official page',
        url: 'https://example.com/a',
        siteName: 'Example',
        icon: 'https://example.com/favicon.ico',
      },
      { url: 'http://ok.example/' },
    ])
  })

  it('caps sources at 20 links', () => {
    const parsed = parseFeatureWrite({
      kind: 'establishment',
      nameEn: 'House',
      nameZh: '',
      status: 'standing',
      start: null,
      end: null,
      lng: null,
      lat: null,
      body: {
        notes: '',
        sources: Array.from({ length: 25 }, (_, i) => ({ url: `https://example.com/${i}` })),
        images: [],
        tags: [],
        customFields: [],
      },
    })
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.body.sources).toHaveLength(20)
  })
})

describe('checkIfMatch', () => {
  it('requires If-Match on update and conflicts when the stamp differs', () => {
    expect(checkIfMatch('2026-01-01T00:00:00.000Z', null)).toBe('missing')
    expect(checkIfMatch('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe('ok')
    expect(checkIfMatch('2026-01-01T00:00:00.000Z', 'stale')).toBe('conflict')
  })
})

describe('rateLimitOk', () => {
  it('allows 30 writes per hour and blocks the 31st', () => {
    expect(rateLimitOk(30)).toBe(true)
    expect(rateLimitOk(31)).toBe(false)
  })
})

describe('wikiCanDelete', () => {
  it('allows delete only for wiki-created rows', () => {
    expect(wikiCanDelete('wiki-abc')).toBe(true)
    expect(wikiCanDelete('bdbiar-1')).toBe(false)
  })
})

describe('applyWikiWrite', () => {
  it('marks a new feature as touched wiki overlay', () => {
    const parsed = parseFeatureWrite({
      kind: 'event',
      nameEn: 'Fair',
      nameZh: '',
      status: 'unknown',
      start: { year: 1941 },
      end: { year: 1941 },
      lng: 114.1,
      lat: 22.2,
      body: { notes: '', sources: [], images: [], tags: [], customFields: [] },
    })
    if ('error' in parsed) throw new Error(parsed.error)
    const feature = applyWikiWrite(null, parsed, { sub: 's', email: 'a@b.co' }, 'id-1', 'fair-1941', '2026-01-01T00:00:00.000Z')
    expect(feature).toMatchObject({
      id: 'id-1',
      slug: 'fair-1941',
      kind: 'event',
      touched: true,
      createdBy: 's',
      updatedBy: 's',
    })
  })
})
