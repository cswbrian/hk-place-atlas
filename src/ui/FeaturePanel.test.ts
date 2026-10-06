import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Feature } from '../domain/feature'
import type { SiteQueryResult } from '../domain/querySite'
import { FeaturePanel } from './FeaturePanel'

const site: SiteQueryResult = {
  lat: 22.28,
  lng: 114.15,
  establishmentIds: ['place-1'],
  buildings: [],
  lots: [],
}

const place: Feature = {
  id: 'place-1',
  slug: 'euro-trade-centre',
  kind: 'establishment',
  nameEn: 'Euro Trade Centre',
  nameZh: '歐洲商業中心',
  status: 'standing',
  start: { year: 1982 },
  end: null,
  lng: 114.15,
  lat: 22.28,
  body: {
    notes: '',
    sources: [],
    images: [],
    tags: [],
    customFields: [],
  },
  touched: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('FeaturePanel site photos', () => {
  it('renders the photos slot under the site panel', () => {
    const html = renderToStaticMarkup(
      createElement(FeaturePanel, {
        locale: 'en',
        site,
        features: [],
        selected: null,
        edges: [],
        onSelectSlug: () => {},
        photos: createElement('section', { 'data-testid': 'site-photos' }, 'Photos slot'),
      }),
    )
    expect(html).toContain('This site')
    expect(html).toContain('data-testid="site-photos"')
    expect(html).toContain('Photos slot')
  })
})

describe('FeaturePanel map-click drill-in levels', () => {
  it('shows This site when a site is open and no place is selected', () => {
    const html = renderToStaticMarkup(
      createElement(FeaturePanel, {
        locale: 'en',
        site,
        features: [place],
        selected: null,
        edges: [],
        onSelectSlug: () => {},
      }),
    )
    expect(html).toContain('This site')
    expect(html).toContain('Choose a place below for details.')
    expect(html).not.toContain('detail-back')
  })

  it('shows place detail with header back when a place is selected', () => {
    const html = renderToStaticMarkup(
      createElement(FeaturePanel, {
        locale: 'en',
        site,
        features: [place],
        selected: place,
        edges: [],
        onSelectSlug: () => {},
        onBack: () => {},
      }),
    )
    expect(html).toContain('Euro Trade Centre')
    expect(html).toContain('aria-label="Back to site"')
    expect(html).toContain('detail-back')
    expect(html).not.toContain('This site')
  })
})
