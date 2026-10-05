import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Feature } from '../domain/feature'
import { DirectoryAside } from './PlacesDirectory'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8')

const place: Feature = {
  id: 'bdbiar-1',
  kind: 'establishment',
  slug: 'third-general-post-office-1911',
  nameEn: 'Third General Post Office',
  nameZh: '第三代郵政總局',
  status: 'demolished',
  start: { year: 1911 },
  end: { year: 1976 },
  lng: 114.16,
  lat: 22.28,
  body: { notes: '', sources: [], images: [], tags: [], customFields: [] },
  touched: false,
  createdAt: '',
  updatedAt: '',
}

describe('places detail column', () => {
  it('uses the same 360px rail as the map sidebar', () => {
    expect(css).toMatch(/\.workspace \{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*360px;/)
    expect(css).toMatch(/\.places-directory \{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*360px;/)
    expect(css).toMatch(/\.places-detail \{[^}]*padding:\s*16px;/)
    expect(css).not.toMatch(/\.places-detail \{[^}]*padding:\s*16px 24px 24px/)
  })
})

describe('DirectoryAside', () => {
  it('shows photos and history in the same panel as the map aside', () => {
    const html = renderToStaticMarkup(
      createElement(DirectoryAside, {
        locale: 'zh-hk',
        feature: place,
        features: [place],
        onSelectSlug: () => undefined,
        onBack: () => undefined,
        onShowHistory: () => undefined,
        onViewMap: () => undefined,
      }),
    )
    expect(html).toContain('Third General Post Office')
    expect(html).toContain('相片')
    expect(html).toContain('歷史')
    expect(html).toContain('在地圖查看')
  })
})
