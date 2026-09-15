import { describe, expect, it } from 'vitest'
import { linkText, normalizeImages, normalizeSources } from './links'

describe('normalizeSources', () => {
  it('keeps a source that has only a URL', () => {
    expect(normalizeSources([{ label: '', url: 'https://gwulo.com/node/6156' }])).toEqual([
      { url: 'https://gwulo.com/node/6156' },
    ])
  })

  it('keeps a source that has only a label', () => {
    expect(normalizeSources([{ label: 'Gwulo 6156', url: '' }])).toEqual([{ label: 'Gwulo 6156' }])
  })

  it('keeps multiple sources and drops empty rows', () => {
    expect(
      normalizeSources([
        { label: 'Gwulo', url: 'https://gwulo.com/node/6156' },
        { label: '  ', url: '  ' },
        { label: '', url: 'https://example.com/post' },
      ]),
    ).toEqual([
      { label: 'Gwulo', url: 'https://gwulo.com/node/6156' },
      { url: 'https://example.com/post' },
    ])
  })
})

describe('normalizeImages', () => {
  it('keeps an image that has only a URL', () => {
    expect(normalizeImages([{ label: '', url: 'https://www.facebook.com/posts/1' }])).toEqual([
      { url: 'https://www.facebook.com/posts/1' },
    ])
  })

  it('drops an image with no URL even if it has a label', () => {
    expect(normalizeImages([{ label: 'Album', url: '' }])).toEqual([])
  })
})

describe('linkText', () => {
  it('uses the label when present', () => {
    expect(linkText({ label: 'Gwulo 6156', url: 'https://gwulo.com/node/6156' })).toBe('Gwulo 6156')
  })

  it('shortens an unlabeled URL to host and path', () => {
    expect(linkText({ url: 'https://gwulo.com/node/6156' })).toBe('gwulo.com/node/6156')
  })

  it('drops query, hash, and www, and decodes the path', () => {
    expect(
      linkText({
        url: 'https://digitalrepository.lib.hku.hk/catalog/cc08hn339#?c=&m=&s=&cv=&xywh=-1258%2C-56%2C3221%2C1111',
      }),
    ).toBe('digitalrepository.lib.hku.hk/catalog/cc08hn339')
    expect(
      linkText({
        url: 'https://www.facebook.com/HKHeritages/posts/55-%E8%A1%8C%E8%A1%97%E8%A1%97%E7%9A%87%E5%90%8E',
      }),
    ).toBe('facebook.com/HKHeritages/posts/55-行街街皇后')
  })

  it('truncates a still-long path with an ellipsis', () => {
    const text = linkText({
      url: 'https://example.com/very/long/path/that-keeps-going/and-going/and-going/filename.pdf',
    })
    expect(text.startsWith('example.com/very/long/path/')).toBe(true)
    expect(text.endsWith('…')).toBe(true)
    expect([...text].length).toBe(56)
  })
})
