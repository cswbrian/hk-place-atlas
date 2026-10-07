import { describe, expect, it } from 'vitest'
import type { Feature } from './feature'
import {
  canonicalHostRedirect,
  browserOrigin,
  crawlerBodyHtml,
  escapeHtml,
  featureJsonLd,
  featureRobots,
  featureSeoHead,
  gtagSnippet,
  homeJsonLd,
  homeSeoHead,
  hreflangLinks,
  injectSeoHead,
  llmsTxt,
  parseSeoPath,
  parseSitemapPath,
  robotsTxt,
  rootPathRedirect,
  schemaType,
  sitemapIndexXml,
  sitemapPageCount,
  sitemapXml,
  SITEMAP_FEATURE_PAGE,
} from './seo'

const stub: Feature = {
  id: 'bdbiar-1',
  kind: 'establishment',
  slug: 'high-house-1981',
  nameEn: 'HIGH HOUSE',
  nameZh: '金高大廈',
  status: 'standing',
  start: { year: 1981 },
  end: null,
  lng: 114.14,
  lat: 22.28,
  body: {
    notes: 'A test <note>',
    sources: [{ label: 'BDBIAR', url: 'https://data.gov.hk' }],
    images: [],
    tags: [],
    customFields: [],
    district: 'Central and Western',
  },
  touched: false,
  createdAt: '',
  updatedAt: '',
}

const wiki: Feature = { ...stub, id: 'wiki-1', touched: true, kind: 'shop', slug: 'cafe-1990', nameEn: 'Cafe' }

describe('parseSeoPath', () => {
  it('reads map roots and place/event slugs', () => {
    expect(parseSeoPath('/en')).toEqual({ type: 'home', locale: 'en' })
    expect(parseSeoPath('/zh-hk/place/high-house-1981')).toEqual({
      type: 'feature',
      locale: 'zh-hk',
      group: 'place',
      slug: 'high-house-1981',
    })
    expect(parseSeoPath('/en/event/fair')).toEqual({ type: 'feature', locale: 'en', group: 'event', slug: 'fair' })
    expect(parseSeoPath('/api/search')).toBeNull()
    expect(parseSeoPath('/assets/index.js')).toBeNull()
  })

  it('does not treat the removed directory as a page', () => {
    expect(parseSeoPath('/en/places')).toBeNull()
    expect(parseSeoPath('/zh-hk/places/high-house-1981')).toBeNull()
    expect(parseSeoPath('/en/place/high-house-1981')?.type).toBe('feature')
  })
})

describe('featureRobots', () => {
  it('indexes all place pages including seed stubs', () => {
    expect(featureRobots(stub)).toBe('index,follow')
    expect(featureRobots(wiki)).toBe('index,follow')
  })
})

describe('hreflangLinks', () => {
  it('pairs en and zh-Hant with x-default on English', () => {
    expect(hreflangLinks('https://atlas.example', '/place/high-house-1981')).toEqual([
      { hreflang: 'en', href: 'https://atlas.example/en/place/high-house-1981' },
      { hreflang: 'zh-Hant', href: 'https://atlas.example/zh-hk/place/high-house-1981' },
      { hreflang: 'x-default', href: 'https://atlas.example/en/place/high-house-1981' },
    ])
  })
})

describe('schemaType', () => {
  it('maps kinds onto schema.org types', () => {
    expect(schemaType('establishment')).toBe('LandmarksOrHistoricalBuildings')
    expect(schemaType('shop')).toBe('LocalBusiness')
    expect(schemaType('event')).toBe('Event')
  })
})

describe('featureJsonLd', () => {
  it('emits geo, sameAs, HK address, and the occupancy schema type', () => {
    const ld = featureJsonLd(stub, 'https://atlas.example', 'en')
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'LandmarksOrHistoricalBuildings',
      name: 'HIGH HOUSE',
      url: 'https://atlas.example/en/place/high-house-1981',
      sameAs: ['https://data.gov.hk'],
      inLanguage: 'en',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'HK',
        addressLocality: 'Central and Western',
      },
    })
    expect(ld).toMatchObject({
      geo: { '@type': 'GeoCoordinates', latitude: 22.28, longitude: 114.14 },
    })
  })
})

describe('homeJsonLd', () => {
  it('describes a bilingual Hong Kong places website', () => {
    expect(homeJsonLd('https://hkatlas.fyi', 'en')).toMatchObject({
      '@type': 'WebSite',
      name: 'HK Atlas',
      url: 'https://hkatlas.fyi/en',
      inLanguage: ['en', 'zh-Hant-HK'],
      about: { '@type': 'Place', name: 'Hong Kong', address: { addressCountry: 'HK' } },
    })
    expect(homeJsonLd('https://hkatlas.fyi', 'en').description).toMatch(/Spatial history database/i)
    expect(homeJsonLd('https://hkatlas.fyi', 'zh-hk')).toMatchObject({
      '@type': 'WebSite',
      name: '香港地圖集',
      url: 'https://hkatlas.fyi/zh-hk',
    })
    expect(homeJsonLd('https://hkatlas.fyi', 'zh-hk').description).toContain('空間歷史資料庫')
  })
})

describe('homeSeoHead', () => {
  it('uses brand-first keyword titles and spatial-history descriptions', () => {
    const en = homeSeoHead('https://hkatlas.fyi', 'en')
    expect(en.title).toBe('HK Atlas — Hong Kong history map of places')
    expect(en.description).toMatch(/Spatial history database/i)
    expect(en.siteName).toBe('HK Atlas')
    expect(en.crawlerBody).toContain('<h1>HK Atlas</h1>')
    expect(en.crawlerBody).toMatch(/spatial history database/i)
    expect(en.crawlerBody).toContain('/en/about')

    const zh = homeSeoHead('https://hkatlas.fyi', 'zh-hk')
    expect(zh.title).toBe('香港地圖集 — 歷史地圖')
    expect(zh.description).toContain('空間歷史資料庫')
    expect(zh.siteName).toBe('香港地圖集')
    expect(zh.crawlerBody).toContain('<h1>香港地圖集</h1>')
    expect(zh.crawlerBody).toContain('空間歷史資料庫')
    expect(zh.crawlerBody).toContain('/zh-hk/about')
  })
})

describe('featureSeoHead', () => {
  it('suffixes the locale h1 title and uses it as og:site_name', () => {
    const en = featureSeoHead(stub, 'https://hkatlas.fyi', 'en')
    expect(en.title).toBe('HIGH HOUSE · HK Atlas')
    expect(en.siteName).toBe('HK Atlas')

    const zh = featureSeoHead(stub, 'https://hkatlas.fyi', 'zh-hk')
    expect(zh.title).toBe('金高大廈 · 香港地圖集')
    expect(zh.siteName).toBe('香港地圖集')
  })
})

describe('browserOrigin', () => {
  it('keeps a real production request on the public site', () => {
    expect(
      browserOrigin('https://hkatlas.fyi/api/auth/google', 'https://hkatlas.fyi', {
        ip: '1.2.3.4',
        ray: 'abc-HKG',
      }),
    ).toBe('https://hkatlas.fyi')
  })

  it('stays on localhost when wrangler rewrites the host to the production domain', () => {
    expect(
      browserOrigin('http://hkatlas.fyi/api/auth/google?return=%2Fen', 'https://hkatlas.fyi', {
        ip: '127.0.0.1',
        ray: null,
      }),
    ).toBe('http://localhost:5173')
  })

  it('stays on localhost for a direct loopback request', () => {
    expect(browserOrigin('http://127.0.0.1:8787/api/auth/google', 'https://hkatlas.fyi', { ip: null, ray: null })).toBe(
      'http://localhost:5173',
    )
  })
})

describe('canonicalHostRedirect', () => {
  it('sends www and workers.dev to the public apex, keeping the path', () => {
    expect(canonicalHostRedirect('https://www.hkatlas.fyi/en/place/x', 'https://hkatlas.fyi')).toBe(
      'https://hkatlas.fyi/en/place/x',
    )
    expect(
      canonicalHostRedirect('https://hk-atlas.still-salad-f965.workers.dev/zh-hk', 'https://hkatlas.fyi'),
    ).toBe('https://hkatlas.fyi/zh-hk')
    expect(canonicalHostRedirect('https://hkatlas.fyi/en', 'https://hkatlas.fyi')).toBeNull()
    expect(canonicalHostRedirect('http://localhost:5173/en', 'https://hkatlas.fyi')).toBeNull()
  })
})

describe('rootPathRedirect', () => {
  it('sends bare slash to English home on the public origin', () => {
    expect(rootPathRedirect('/', 'https://hkatlas.fyi')).toBe('https://hkatlas.fyi/en')
    expect(rootPathRedirect('/en', 'https://hkatlas.fyi')).toBeNull()
  })
})

describe('robotsTxt', () => {
  it('allows AI crawlers, blocks API, and points at the sitemap', () => {
    const body = robotsTxt('https://hkatlas.fyi')
    expect(body).toContain('Sitemap: https://hkatlas.fyi/sitemap.xml')
    expect(body).toContain('Disallow: /api/')
    expect(body).toContain('User-agent: GPTBot')
    expect(body).toContain('User-agent: Google-Extended')
    expect(body).toContain('Allow: /')
  })
})

describe('sitemapXml', () => {
  it('lists locale homes and all features with hreflang pairs', () => {
    const xml = sitemapXml('https://hkatlas.fyi', [
      { kind: 'shop', slug: 'cafe-1990' },
      { kind: 'event', slug: 'fair-1997' },
    ])
    expect(xml).toContain('<loc>https://hkatlas.fyi/en</loc>')
    expect(xml).toContain('<loc>https://hkatlas.fyi/zh-hk</loc>')
    expect(xml).not.toContain('/places')
    expect(xml).toContain('<loc>https://hkatlas.fyi/en/place/cafe-1990</loc>')
    expect(xml).toContain('<loc>https://hkatlas.fyi/zh-hk/event/fair-1997</loc>')
    expect(xml).toContain('hreflang="zh-Hant"')
    expect(xml).toContain('xhtml:link')
  })

  it('can omit homes on later chunk pages', () => {
    const xml = sitemapXml('https://hkatlas.fyi', [{ kind: 'shop', slug: 'cafe-1990' }], { includeHomes: false })
    expect(xml).not.toContain('<loc>https://hkatlas.fyi/en</loc>')
    expect(xml).toContain('<loc>https://hkatlas.fyi/en/place/cafe-1990</loc>')
  })
})

describe('sitemapIndexXml', () => {
  it('lists chunk sitemap files under the origin', () => {
    const xml = sitemapIndexXml('https://hkatlas.fyi', 2)
    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain('<loc>https://hkatlas.fyi/sitemap-0.xml</loc>')
    expect(xml).toContain('<loc>https://hkatlas.fyi/sitemap-1.xml</loc>')
  })
})

describe('parseSitemapPath', () => {
  it('reads the index and numbered chunk paths', () => {
    expect(parseSitemapPath('/sitemap.xml')).toEqual({ type: 'index' })
    expect(parseSitemapPath('/sitemap-0.xml')).toEqual({ type: 'page', page: 0 })
    expect(parseSitemapPath('/sitemap-12.xml')).toEqual({ type: 'page', page: 12 })
    expect(parseSitemapPath('/sitemap.xml.bak')).toBeNull()
  })
})

describe('sitemapPageCount', () => {
  it('pages features so each file stays under the URL cap', () => {
    expect(sitemapPageCount(0)).toBe(1)
    expect(sitemapPageCount(100)).toBe(1)
    expect(sitemapPageCount(SITEMAP_FEATURE_PAGE)).toBe(1)
    expect(sitemapPageCount(SITEMAP_FEATURE_PAGE + 1)).toBe(2)
  })
})

describe('llmsTxt', () => {
  it('summarizes the atlas for AI crawlers', () => {
    const body = llmsTxt('https://hkatlas.fyi')
    expect(body).toContain('HK Atlas · 香港地圖集')
    expect(body).toMatch(/Spatial History Database/i)
    expect(body).toContain('空間歷史資料庫')
    expect(body).toContain('https://hkatlas.fyi/en')
    expect(body).toContain('/en/about')
    expect(body).not.toContain('/places')
    expect(body).toContain('/place/{slug}')
    expect(body).toContain('sitemap')
  })
})

describe('crawlerBodyHtml', () => {
  it('frames the home page as a spatial history database', () => {
    const en = crawlerBodyHtml({ type: 'home', locale: 'en' })
    expect(en).toMatch(/spatial history database/i)
    expect(en).toContain('href="/en/about"')
  })

  it('renders readable place copy for crawlers inside #root', () => {
    const body = crawlerBodyHtml({ type: 'feature', feature: stub, locale: 'en' })
    expect(body).toContain('<main')
    expect(body).toContain('HIGH HOUSE')
    expect(body).toContain('金高大廈')
    expect(body).toContain('Central and Western')
    expect(body).toContain('Hong Kong')
    expect(body).toContain('A test &lt;note&gt;')
  })
})

describe('gtagSnippet', () => {
  it('emits the measurement id script or nothing', () => {
    expect(gtagSnippet('G-NKVYYE1Y49')).toContain('G-NKVYYE1Y49')
    expect(gtagSnippet('G-NKVYYE1Y49')).toContain('googletagmanager.com/gtag/js')
    expect(gtagSnippet(undefined)).toBe('')
    expect(gtagSnippet('')).toBe('')
  })
})

describe('injectSeoHead', () => {
  it('sets lang, OG tags, crawler body, gtag, and escaped JSON-LD', () => {
    const html = injectSeoHead(
      '<html lang="en"><head><title>Old</title></head><body><div id="root"></div></body></html>',
      {
        lang: 'zh-Hant-HK',
        title: 'Cafe & Bar',
        description: 'A shop',
        robots: 'index,follow',
        canonical: 'https://atlas.example/en/place/cafe',
        alternates: hreflangLinks('https://atlas.example', '/place/cafe'),
        jsonLd: { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Cafe <Bar>' },
        ogType: 'website',
        ogLocale: 'en_US',
        ogLocaleAlternate: 'zh_HK',
        siteName: 'HK Atlas',
        crawlerBody: '<main><h1>Cafe</h1></main>',
      },
      'G-NKVYYE1Y49',
    )
    expect(html).toContain('lang="zh-Hant-HK"')
    expect(html).toContain('<title>Cafe &amp; Bar</title>')
    expect(html).toContain('name="robots" content="index,follow"')
    expect(html).toContain('hreflang="zh-Hant"')
    expect(html).toContain('property="og:title" content="Cafe &amp; Bar"')
    expect(html).toContain('property="og:site_name" content="HK Atlas"')
    expect(html).toContain('property="og:url" content="https://atlas.example/en/place/cafe"')
    expect(html).toContain('name="twitter:card" content="summary"')
    expect(html).toContain('<main><h1>Cafe</h1></main>')
    expect(html).toContain('G-NKVYYE1Y49')
    expect(html).toContain('\\u003c')
    expect(escapeHtml('<x>')).toBe('&lt;x&gt;')
  })
})
