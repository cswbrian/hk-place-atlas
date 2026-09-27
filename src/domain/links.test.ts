import { describe, expect, it } from 'vitest'
import { linkText } from './links'

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
