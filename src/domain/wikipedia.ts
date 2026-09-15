import type { FuzzyDate, LocalizedName, Source } from './types'
import type { PlaceSourceDraft } from './ingest'

type WikimediaQuery = {
  query?: {
    pages?: unknown
  }
}

type WikiPage = {
  title?: string
  extract?: string
  coordinates?: Array<{ lat?: number; lon?: number }>
  pageprops?: { wikibase_item?: string }
  revisions?: Array<{
    content?: string
    slots?: { main?: { content?: string } }
  }>
}

export function wikiPlaceId(urlOrTitle: string): string {
  let title = urlOrTitle.trim()
  try {
    const parsed = new URL(title)
    title = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''))
  } catch {
    // already a title
  }
  const slug = title
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `wiki-${slug || 'unknown'}`
}

export function parseWikipediaPlace(input: { url: string; query: WikimediaQuery }): PlaceSourceDraft {
  const page = wikiPages(input.query)[0]
  const wikitext = wikiContent(page)
  const infobox = infoboxFields(wikitext)
  const title = String(page?.title ?? wikiTitleFromUrl(input.url))
  const zh = chineseName(infobox.native_name)
  const names: LocalizedName[] = [{ lang: 'en', text: title, primary: true }]
  if (zh) names.push({ lang: 'zh-Hant', text: zh })
  const coord = Array.isArray(page?.coordinates) ? page.coordinates[0] : undefined
  const extract = typeof page?.extract === 'string' ? page.extract.trim() : ''
  const built = parseYearField(infobox.completion_date ?? infobox.opened_date)
  const demolished = parseYearField(infobox.demolished_date ?? infobox.closing_date)
  const sources: Source[] = [{ label: 'Wikipedia', url: input.url }]
  const wikidata = page?.pageprops?.wikibase_item
  if (wikidata) sources.push({ label: 'Wikidata', url: `https://www.wikidata.org/wiki/${wikidata}` })
  const commons = matchOne(wikitext, /\{\{\s*commons[\s_]*category\s*\|([^}|]+)/i)
  if (commons) {
    const category = commons.trim().replace(/_/g, ' ')
    sources.push({
      label: 'Wikimedia Commons',
      url: `https://commons.wikimedia.org/wiki/Category:${category.replace(/ /g, '_')}`,
    })
  }
  return {
    kind: 'wikipedia',
    url: input.url,
    proposedId: wikiPlaceId(input.url),
    names,
    status: demolished ? 'demolished' : 'standing',
    built,
    demolished,
    lat: typeof coord?.lat === 'number' ? coord.lat : undefined,
    lng: typeof coord?.lon === 'number' ? coord.lon : undefined,
    locationLabel: locationLabel(infobox, extract),
    notes: extract,
    laterPlaceTitles: [],
    sources,
    customFields: [{ key: 'wikipediaTitle', value: title }],
  }
}

const WIKI_UA = 'HKPlaceAtlas/0.0 (local historical map; wikipedia ingest)'

export async function fetchWikipediaPlace(
  articleUrl: string,
  getJson: (url: string) => Promise<WikimediaQuery> = defaultGetJson,
): Promise<PlaceSourceDraft> {
  const title = wikiTitleFromUrl(articleUrl)
  const host = wikipediaApiHost(articleUrl)
  const query = await getJson(wikiApiUrl(host, {
    action: 'query',
    format: 'json',
    formatversion: '2',
    titles: title,
    prop: 'coordinates|extracts|revisions|pageprops',
    ppprop: 'wikibase_item',
    exintro: '1',
    explaintext: '1',
    rvprop: 'content',
    rvslots: 'main',
  }))
  return parseWikipediaPlace({ url: articleUrl, query })
}

function wikipediaApiHost(articleUrl: string): string {
  try {
    return new URL(articleUrl).host
  } catch {
    return 'en.wikipedia.org'
  }
}

function wikiApiUrl(host: string, params: Record<string, string>): string {
  const url = new URL(`https://${host}/w/api.php`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

async function defaultGetJson(url: string): Promise<WikimediaQuery> {
  const response = await fetch(url, { headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Wikipedia API ${response.status} for ${url}`)
  return response.json() as Promise<WikimediaQuery>
}

function wikiTitleFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/wiki\//, '')).replace(/_/g, ' ')
  } catch {
    return url
  }
}

function wikiPages(payload: WikimediaQuery): WikiPage[] {
  const pages = payload.query?.pages
  if (Array.isArray(pages)) return pages.filter(isWikiPage)
  if (pages && typeof pages === 'object') return Object.values(pages).filter(isWikiPage)
  return []
}

function isWikiPage(value: unknown): value is WikiPage {
  return Boolean(value) && typeof value === 'object'
}

function wikiContent(page: WikiPage | undefined): string {
  const revision = page?.revisions?.[0]
  if (typeof revision?.slots?.main?.content === 'string') return revision.slots.main.content
  if (typeof revision?.content === 'string') return revision.content
  return ''
}

function infoboxFields(wikitext: string): Record<string, string> {
  const start = wikitext.search(/\{\{\s*Infobox\s+building/i)
  const block = start >= 0 ? wikitext.slice(start, start + 4000) : wikitext.slice(0, 4000)
  const fields: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const match = /^\|\s*([a-z0-9_]+)\s*=\s*(.*)$/i.exec(line.trim())
    if (!match?.[1]) continue
    const value = match[2]?.trim() ?? ''
    if (value) fields[match[1]] = value
  }
  return fields
}

function parseYearField(value: string | undefined): FuzzyDate | null {
  if (!value) return null
  const match = value.match(/(?:end\s*date\|)?(\d{4})/i)
  if (!match?.[1]) return null
  return { year: Number(match[1]) }
}

function chineseName(value: string | undefined): string | undefined {
  const text = value?.replace(/<[^>]+>/g, '').trim()
  if (!text || !/[\u4e00-\u9fff]/.test(text)) return undefined
  return text
}

function locationLabel(infobox: Record<string, string>, extract: string): string | undefined {
  const fromBox = stripWiki(infobox.address || infobox.location || infobox.location_city)
  if (fromBox && !/flag\|/i.test(fromBox)) return fromBox
  const located = extract.match(/located on ([^.]+)/i)?.[1]?.trim()
  if (located) return located.replace(/,\s*Hong Kong$/i, '')
  const caption = stripWiki(infobox.image_caption)
  return caption || undefined
}

function stripWiki(value: string | undefined): string {
  if (!value) return ''
  return value
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchOne(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]
}
