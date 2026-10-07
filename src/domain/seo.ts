import type { Event, LandmarksOrHistoricalBuildings, LocalBusiness, WithContext } from 'schema-dts'
import { copy, featurePublicPath, parseFeaturePath, parseLocalePath, type SiteLocale } from './locale'
import type { Feature, FeatureKind } from './feature'

export type SeoHome = { type: 'home'; locale: SiteLocale }
export type SeoFeature = { type: 'feature'; locale: SiteLocale; group: 'place' | 'event'; slug: string }
export type SeoAbout = { type: 'about'; locale: SiteLocale }
export type SeoPath = SeoHome | SeoFeature | SeoAbout

export type HreflangLink = { hreflang: string; href: string }

export type SeoHead = {
  lang: string
  title: string
  description: string
  robots: string
  canonical: string
  alternates: HreflangLink[]
  jsonLd: unknown
  ogType: string
  ogLocale: string
  ogLocaleAlternate: string
  siteName: string
  crawlerBody: string
}

export type SitemapFeature = { kind: FeatureKind; slug: string }

type SchemaThing = WithContext<LandmarksOrHistoricalBuildings | LocalBusiness | Event>

const OG_LOCALE: Record<SiteLocale, string> = {
  en: 'en_US',
  hk: 'zh_HK',
}

export function parseSeoPath(pathname: string): SeoPath | null {
  const { locale, rest } = parseLocalePath(pathname)
  const first = pathname.replace(/\/+$/, '').split('/').filter(Boolean)[0]
  if (first !== 'en' && first !== 'hk') return null
  if (rest === '/') return { type: 'home', locale }
  if (rest === '/about') return { type: 'about', locale }
  const feature = parseFeaturePath(rest)
  if (!feature) return null
  return { type: 'feature', locale, group: feature.group, slug: feature.slug }
}

export function featureRobots(_feature: Pick<Feature, 'touched'>): string {
  return 'index,follow'
}

export function hreflangLinks(origin: string, rest: string): HreflangLink[] {
  const suffix = rest === '/' ? '' : rest
  return [
    { hreflang: 'en', href: `${origin}/en${suffix}` },
    { hreflang: 'zh-Hant', href: `${origin}/hk${suffix}` },
    { hreflang: 'x-default', href: `${origin}/hk${suffix}` },
  ]
}

export function schemaType(kind: FeatureKind): 'LandmarksOrHistoricalBuildings' | 'LocalBusiness' | 'Event' | 'Thing' {
  if (kind === 'shop') return 'LocalBusiness'
  if (kind === 'event') return 'Event'
  if (kind === 'establishment') return 'LandmarksOrHistoricalBuildings'
  return 'Thing'
}

export function htmlLang(locale: SiteLocale): string {
  return locale === 'hk' ? 'zh-Hant-HK' : 'en'
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

function featureName(feature: Feature, locale: SiteLocale): string {
  if (locale === 'hk') return feature.nameZh.trim() || feature.nameEn
  return feature.nameEn.trim() || feature.nameZh
}

function isoDate(feature: Feature['start']): string | undefined {
  if (!feature?.year) return undefined
  if (feature.month && feature.day) {
    return `${feature.year}-${String(feature.month).padStart(2, '0')}-${String(feature.day).padStart(2, '0')}`
  }
  return String(feature.year)
}

function postalAddress(feature: Feature) {
  return {
    '@type': 'PostalAddress' as const,
    addressCountry: 'HK',
    addressLocality: feature.body.district || undefined,
    addressRegion: feature.body.region || undefined,
  }
}

export function featureJsonLd(feature: Feature, origin: string, locale: SiteLocale): SchemaThing {
  const url = `${origin}${featurePublicPath(locale, feature.kind, feature.slug)}`
  const sameAs = feature.body.sources.map((source) => source.url).filter((url): url is string => Boolean(url))
  const base = {
    '@context': 'https://schema.org' as const,
    name: featureName(feature, locale),
    url,
    description: feature.body.notes || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    inLanguage: htmlLang(locale),
    address: postalAddress(feature),
    geo:
      feature.lat != null && feature.lng != null
        ? { '@type': 'GeoCoordinates' as const, latitude: feature.lat, longitude: feature.lng }
        : undefined,
  }
  const type = schemaType(feature.kind)
  if (type === 'Event') {
    return {
      ...base,
      '@type': 'Event',
      startDate: isoDate(feature.start),
      endDate: isoDate(feature.end),
    }
  }
  if (type === 'LocalBusiness') {
    return { ...base, '@type': 'LocalBusiness' }
  }
  return { ...base, '@type': 'LandmarksOrHistoricalBuildings' }
}

export function homeJsonLd(origin: string, locale: SiteLocale) {
  return {
    '@context': 'https://schema.org' as const,
    '@type': 'WebSite' as const,
    name: copy[locale].title,
    description: copy[locale].seoDescription,
    url: `${origin}/${locale}`,
    inLanguage: ['en', 'zh-Hant-HK'] as const,
    about: {
      '@type': 'Place' as const,
      name: 'Hong Kong',
      address: { '@type': 'PostalAddress' as const, addressCountry: 'HK' },
    },
  }
}

export function aboutJsonLd(origin: string, locale: SiteLocale) {
  const text = copy[locale]
  return {
    '@context': 'https://schema.org' as const,
    '@type': 'AboutPage' as const,
    name: text.aboutSeoTitle,
    description: text.aboutSeoDescription,
    url: `${origin}/${locale}/about`,
    inLanguage: htmlLang(locale),
    isPartOf: { '@type': 'WebSite' as const, name: text.title, url: `${origin}/${locale}` },
    about: {
      '@type': 'Thing' as const,
      name: text.category,
    },
  }
}

function siteName(locale: SiteLocale): string {
  return copy[locale].title
}

function ogLocaleAlternate(locale: SiteLocale): string {
  return locale === 'en' ? OG_LOCALE.hk : OG_LOCALE.en
}

export function crawlerBodyHtml(
  input:
    | { type: 'home'; locale: SiteLocale }
    | { type: 'about'; locale: SiteLocale }
    | { type: 'feature'; feature: Feature; locale: SiteLocale }
    | { type: 'notFound'; locale: SiteLocale },
): string {
  if (input.type === 'home') {
    const text = copy[input.locale]
    const aboutHref = `/${input.locale}/about`
    const bullets = text.aboutBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')
    return [
      `<main>`,
      `<h1>${escapeHtml(text.title)}</h1>`,
      `<p>${escapeHtml(text.aboutLead)}</p>`,
      `<ul>${bullets}</ul>`,
      `<p><a href="${escapeHtml(aboutHref)}">${escapeHtml(text.aboutNav)}</a></p>`,
      `</main>`,
    ].join('')
  }
  if (input.type === 'about') {
    const text = copy[input.locale]
    const mapHref = `/${input.locale}`
    const bullets = text.aboutBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')
    return [
      `<main>`,
      `<h1>${escapeHtml(text.aboutHeading)}</h1>`,
      `<p>${escapeHtml(text.aboutLead)}</p>`,
      `<p>${escapeHtml(text.aboutBody)}</p>`,
      `<p>${escapeHtml(text.aboutCan)}</p>`,
      `<ul>${bullets}</ul>`,
      `<p><a href="${escapeHtml(mapHref)}">${escapeHtml(text.aboutBack)}</a></p>`,
      `</main>`,
    ].join('')
  }
  if (input.type === 'notFound') {
    const text = copy[input.locale]
    return `<main><h1>${escapeHtml(text.title)}</h1><p>${escapeHtml(text.emptySite)}</p></main>`
  }
  const { feature, locale } = input
  const primary = featureName(feature, locale)
  const secondary = locale === 'hk' ? feature.nameEn.trim() : feature.nameZh.trim()
  const start = isoDate(feature.start)
  const end = isoDate(feature.end)
  const district = feature.body.district?.trim()
  const notes = feature.body.notes.trim()
  const sources = feature.body.sources
    .filter((source) => source.url)
    .map((source) => `<li><a href="${escapeHtml(source.url!)}">${escapeHtml(source.label || source.url!)}</a></li>`)
    .join('')
  const parts = [
    `<main>`,
    `<h1>${escapeHtml(primary)}</h1>`,
    secondary && secondary !== primary ? `<p>${escapeHtml(secondary)}</p>` : '',
    start || end ? `<p>${escapeHtml([start, end].filter(Boolean).join(' – '))}</p>` : '',
    `<p>${escapeHtml(district ? `${district}, Hong Kong` : 'Hong Kong')}</p>`,
    notes ? `<p>${escapeHtml(notes)}</p>` : '',
    sources ? `<ul>${sources}</ul>` : '',
    `</main>`,
  ]
  return parts.filter(Boolean).join('')
}

export function featureSeoHead(feature: Feature, origin: string, locale: SiteLocale): SeoHead {
  const rest = featurePublicPath(locale, feature.kind, feature.slug).replace(/^\/(en|hk)/, '') || '/'
  const name = featureName(feature, locale)
  const title = `${name} · ${copy[locale].title}`
  const fallback =
    locale === 'hk'
      ? `${name} — 香港地圖集上的香港歷史地方`
      : `${name} — historical place in Hong Kong on HONG KONG ATLAS`
  const description = feature.body.notes.trim() || fallback
  return {
    lang: htmlLang(locale),
    title,
    description,
    robots: featureRobots(feature),
    canonical: `${origin}${featurePublicPath(locale, feature.kind, feature.slug)}`,
    alternates: hreflangLinks(origin, rest),
    jsonLd: featureJsonLd(feature, origin, locale),
    ogType: feature.kind === 'event' ? 'article' : 'website',
    ogLocale: OG_LOCALE[locale],
    ogLocaleAlternate: ogLocaleAlternate(locale),
    siteName: siteName(locale),
    crawlerBody: crawlerBodyHtml({ type: 'feature', feature, locale }),
  }
}

export function homeSeoHead(origin: string, locale: SiteLocale): SeoHead {
  return {
    lang: htmlLang(locale),
    title: copy[locale].seoTitle,
    description: copy[locale].seoDescription,
    robots: 'index,follow',
    canonical: `${origin}/${locale}`,
    alternates: hreflangLinks(origin, '/'),
    jsonLd: homeJsonLd(origin, locale),
    ogType: 'website',
    ogLocale: OG_LOCALE[locale],
    ogLocaleAlternate: ogLocaleAlternate(locale),
    siteName: siteName(locale),
    crawlerBody: crawlerBodyHtml({ type: 'home', locale }),
  }
}

export function aboutSeoHead(origin: string, locale: SiteLocale): SeoHead {
  const text = copy[locale]
  return {
    lang: htmlLang(locale),
    title: text.aboutSeoTitle,
    description: text.aboutSeoDescription,
    robots: 'index,follow',
    canonical: `${origin}/${locale}/about`,
    alternates: hreflangLinks(origin, '/about'),
    jsonLd: aboutJsonLd(origin, locale),
    ogType: 'website',
    ogLocale: OG_LOCALE[locale],
    ogLocaleAlternate: ogLocaleAlternate(locale),
    siteName: siteName(locale),
    crawlerBody: crawlerBodyHtml({ type: 'about', locale }),
  }
}

export function notFoundSeoHead(origin: string, locale: SiteLocale): SeoHead {
  return {
    lang: htmlLang(locale),
    title: copy[locale].title,
    description: copy[locale].tagline,
    robots: 'noindex,follow',
    canonical: `${origin}/${locale}`,
    alternates: hreflangLinks(origin, '/'),
    jsonLd: homeJsonLd(origin, locale),
    ogType: 'website',
    ogLocale: OG_LOCALE[locale],
    ogLocaleAlternate: ogLocaleAlternate(locale),
    siteName: siteName(locale),
    crawlerBody: crawlerBodyHtml({ type: 'notFound', locale }),
  }
}

export function gtagSnippet(measurementId: string | undefined): string {
  const id = measurementId?.trim()
  if (!id) return ''
  const safe = escapeHtml(id)
  return [
    `<meta name="ga-measurement-id" content="${safe}" />`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${safe}"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${safe}');</script>`,
  ].join('')
}

export function injectSeoHead(html: string, head: SeoHead, measurementId?: string): string {
  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
    `<meta name="robots" content="${escapeHtml(head.robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(head.canonical)}" />`,
    ...head.alternates.map(
      (link) => `<link rel="alternate" hreflang="${escapeHtml(link.hreflang)}" href="${escapeHtml(link.href)}" />`,
    ),
    `<meta property="og:title" content="${escapeHtml(head.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(head.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(head.canonical)}" />`,
    `<meta property="og:type" content="${escapeHtml(head.ogType)}" />`,
    `<meta property="og:locale" content="${escapeHtml(head.ogLocale)}" />`,
    `<meta property="og:locale:alternate" content="${escapeHtml(head.ogLocaleAlternate)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(head.siteName)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<script type="application/ld+json">${safeJsonLd(head.jsonLd)}</script>`,
    gtagSnippet(measurementId),
  ].join('')
  let next = html
    .replace(/<html\b([^>]*)>/i, `<html lang="${escapeHtml(head.lang)}">`)
    .replace(/<title>[^<]*<\/title>/i, '')
    .replace('</head>', `${tags}</head>`)
  if (head.crawlerBody) {
    next = next.replace(/<div id="root"><\/div>/i, `<div id="root">${head.crawlerBody}</div>`)
  }
  return next
}

export function browserOrigin(
  requestUrl: string,
  configuredOrigin: string | undefined,
  headers: { ip: string | null; ray: string | null },
): string {
  const url = new URL(requestUrl)
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  const localWorker = headers.ip === '127.0.0.1' && !headers.ray
  if (loopback || localWorker) return 'http://localhost:5173'
  return configuredOrigin || url.origin
}

export function canonicalHostRedirect(requestUrl: string, publicOrigin: string): string | null {
  const url = new URL(requestUrl)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return null
  const target = new URL(publicOrigin)
  if (url.hostname === target.hostname) return null
  if (url.hostname === `www.${target.hostname}` || url.hostname.endsWith('.workers.dev')) {
    return `${target.origin}${url.pathname}${url.search}`
  }
  return null
}

export function rootPathRedirect(pathname: string, publicOrigin: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path !== '/') return null
  return `${publicOrigin.replace(/\/+$/, '')}/hk`
}

export function robotsTxt(origin: string): string {
  const agents = ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'PerplexityBot', 'ClaudeBot', 'Applebot-Extended']
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    ...agents.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
    `Sitemap: ${origin.replace(/\/+$/, '')}/sitemap.xml`,
    '',
  ]
  return lines.join('\n')
}

/** Features per chunk file. Each feature emits 2 locale URLs; stay under the 50k URL cap. */
export const SITEMAP_FEATURE_PAGE = 20_000

export function sitemapPageCount(featureCount: number): number {
  if (featureCount <= 0) return 1
  return Math.ceil(featureCount / SITEMAP_FEATURE_PAGE)
}

export function parseSitemapPath(
  pathname: string,
): { type: 'index' } | { type: 'page'; page: number } | null {
  if (pathname === '/sitemap.xml') return { type: 'index' }
  const match = /^\/sitemap-(\d+)\.xml$/.exec(pathname)
  if (!match) return null
  return { type: 'page', page: Number(match[1]) }
}

export function sitemapIndexXml(origin: string, pageCount: number): string {
  const base = origin.replace(/\/+$/, '')
  const pages = Array.from({ length: Math.max(pageCount, 1) }, (_, page) => {
    return `<sitemap><loc>${escapeHtml(`${base}/sitemap-${page}.xml`)}</loc></sitemap>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages,
    '</sitemapindex>',
  ].join('')
}

export function sitemapXml(
  origin: string,
  features: SitemapFeature[],
  options: { includeHomes?: boolean } = {},
): string {
  const includeHomes = options.includeHomes !== false
  const base = origin.replace(/\/+$/, '')
  const urls: string[] = []
  const pushPair = (rest: string) => {
    const hk = `${base}/hk${rest}`
    const en = `${base}/en${rest}`
    for (const loc of [hk, en]) {
      urls.push(
        [
          '<url>',
          `<loc>${escapeHtml(loc)}</loc>`,
          `<xhtml:link rel="alternate" hreflang="zh-Hant" href="${escapeHtml(hk)}" />`,
          `<xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(en)}" />`,
          `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(hk)}" />`,
          '</url>',
        ].join(''),
      )
    }
  }
  if (includeHomes) {
    pushPair('')
    pushPair('/about')
  }
  for (const feature of features) {
    const group = feature.kind === 'event' ? 'event' : 'place'
    pushPair(`/${group}/${feature.slug}`)
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
  ].join('')
}

export function llmsTxt(origin: string): string {
  const base = origin.replace(/\/+$/, '')
  return [
    '# HONG KONG ATLAS · 香港地圖集',
    '',
    '> Spatial History Database / 空間歷史資料庫 — bilingual map of Hong Kong buildings, shops, and events over time.',
    '',
    `- English: ${base}/en`,
    `- 繁體中文: ${base}/hk`,
    `- About: ${base}/en/about · ${base}/hk/about`,
    `- Places: ${base}/en/place/{slug} and ${base}/hk/place/{slug}`,
    `- Events: ${base}/en/event/{slug} and ${base}/hk/event/{slug}`,
    `- Sitemap: ${base}/sitemap.xml`,
    '',
    'All catalog places are listed in the sitemap (English and 繁體). Wiki-enriched pages have more text.',
    'JSON APIs under /api/ are for the map client, not human-readable pages.',
    '',
  ].join('\n')
}
