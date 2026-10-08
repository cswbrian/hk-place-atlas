import { describe, expect, it } from 'vitest'
import { parseLinkMeta } from './linkMeta'

describe('parseLinkMeta', () => {
  it('prefers og:title over title and decodes entities', () => {
    const html = `
      <html><head>
        <title>Plain &amp; Title</title>
        <meta property="og:title" content="OG &amp; Title" />
        <meta property="og:site_name" content="News Site" />
        <link rel="icon" href="/favicon.png" />
      </head></html>
    `
    expect(parseLinkMeta(html, 'https://news.example/story')).toEqual({
      title: 'OG & Title',
      siteName: 'News Site',
      icon: 'https://news.example/favicon.png',
    })
  })

  it('falls back to hostname for site name and /favicon.ico for icon', () => {
    const html = `<html><head><title>Just a title</title></head></html>`
    expect(parseLinkMeta(html, 'https://www.example.com/path')).toEqual({
      title: 'Just a title',
      siteName: 'example.com',
      icon: 'https://www.example.com/favicon.ico',
    })
  })

  it('resolves absolute and protocol-relative icon hrefs', () => {
    expect(
      parseLinkMeta(
        `<html><head><link rel="shortcut icon" href="//cdn.example/i.ico"></head></html>`,
        'https://www.example.com/',
      ).icon,
    ).toBe('https://cdn.example/i.ico')
  })
})
