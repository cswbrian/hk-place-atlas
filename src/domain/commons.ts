import { mergePlaceIngests, type PlaceIngest } from './ingest.ts'
import type { AtlasRecord, Place, Relation } from './types'

export function commonsPlaceId(urlOrTitle: string): string {
  let title = urlOrTitle.trim()
  try {
    const parsed = new URL(title)
    title = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''))
  } catch {
    // already a category title
  }
  title = title.replace(/^Category:/i, '')
  const slug = title
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `commons-${slug}`
}

export function commonsFileId(fileTitle: string): string {
  return commonsPlaceId(fileTitle.replace(/^File:/i, '')).replace(/^commons-/, 'commons-file-')
}

export type CommonsFileDraft = {
  title: string
  pageUrl: string
  imageUrl?: string
  description?: string
  artist?: string
  license?: string
  date?: string
  lat?: number
  lng?: number
}

export type CommonsCategoryDraft = {
  title: string
  url: string
  extract?: string
  lat?: number
  lng?: number
  files: CommonsFileDraft[]
}

type WikimediaQuery = {
  query?: {
    pages?: unknown
  }
}

export function parseCommonsCategoryDraft(input: {
  categoryUrl: string
  category: WikimediaQuery
  files: WikimediaQuery
}): CommonsCategoryDraft {
  const categoryPage = wikiPages(input.category)[0]
  const coord = Array.isArray(categoryPage?.coordinates) ? categoryPage.coordinates[0] : undefined
  const wikitext = wikiContent(categoryPage)
  const fromWiki = parseObjectLocation(wikitext)
  const extract = typeof categoryPage?.extract === 'string' && categoryPage.extract.trim()
    ? categoryPage.extract.trim()
    : parseEnCaption(wikitext)
  return {
    title: String(categoryPage?.title ?? commonsCategoryTitle(input.categoryUrl)),
    url: input.categoryUrl,
    extract,
    lat: typeof coord?.lat === 'number' ? coord.lat : fromWiki.lat,
    lng: typeof coord?.lon === 'number' ? coord.lon : fromWiki.lng,
    files: wikiPages(input.files).flatMap((page) => {
      const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : undefined
      if (!page.title) return []
      const meta = info?.extmetadata ?? {}
      const file: CommonsFileDraft = {
        title: page.title,
        pageUrl: typeof info?.descriptionurl === 'string'
          ? info.descriptionurl
          : `https://commons.wikimedia.org/wiki/${page.title.replace(/ /g, '_')}`,
        imageUrl: typeof info?.url === 'string' ? info.url : undefined,
        description: metaText(meta.ImageDescription),
        artist: metaText(meta.Artist),
        license: metaText(meta.LicenseShortName),
        date: metaText(meta.DateTimeOriginal),
      }
      const fileCoord = Array.isArray(page.coordinates) ? page.coordinates[0] : undefined
      if (typeof fileCoord?.lat === 'number') file.lat = fileCoord.lat
      if (typeof fileCoord?.lon === 'number') file.lng = fileCoord.lon
      return [file]
    }),
  }
}

function commonsCategoryTitle(url: string): string {
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

type WikiPage = {
  title?: string
  extract?: string
  coordinates?: Array<{ lat?: number; lon?: number }>
  revisions?: Array<{
    content?: string
    slots?: { main?: { content?: string } }
  }>
  imageinfo?: Array<{
    url?: string
    descriptionurl?: string
    extmetadata?: Record<string, { value?: string } | undefined>
  }>
}

function wikiContent(page: WikiPage | undefined): string {
  const revision = page?.revisions?.[0]
  if (typeof revision?.slots?.main?.content === 'string') return revision.slots.main.content
  if (typeof revision?.content === 'string') return revision.content
  return ''
}

function parseObjectLocation(wikitext: string): { lat?: number; lng?: number } {
  const match = wikitext.match(/\{\{\s*object location\s*\|([^}]+)\}\}/i)
  if (!match?.[1]) return {}
  const nums = match[1]
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part && !part.includes('='))
    .map(Number)
    .filter((value) => Number.isFinite(value))
  if (nums.length < 2) return {}
  return { lat: nums[0], lng: nums[1] }
}

function parseEnCaption(wikitext: string): string | undefined {
  const match = wikitext.match(/\{\{\s*en\s*\|([\s\S]*?)\}\}/i)
  if (!match?.[1]) return undefined
  const text = match[1]
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text || undefined
}

function isWikiPage(value: unknown): value is WikiPage {
  return Boolean(value) && typeof value === 'object'
}

function metaText(field: { value?: string } | undefined): string | undefined {
  const raw = field?.value?.trim()
  if (!raw) return undefined
  const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text || undefined
}

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const COMMONS_UA = 'HKPlaceAtlas/0.0 (local historical map; commons category ingest)'

export async function fetchCommonsCategory(
  categoryUrl: string,
  getJson: (url: string) => Promise<WikimediaQuery> = defaultGetJson,
): Promise<CommonsCategoryDraft> {
  const title = commonsApiTitle(categoryUrl)
  const category = await getJson(commonsApiUrl({
    action: 'query',
    format: 'json',
    formatversion: '2',
    titles: title,
    prop: 'coordinates|extracts|revisions',
    rvprop: 'content',
    rvslots: 'main',
    explaintext: '1',
    exchars: '1200',
  }))
  const files = await getJson(commonsApiUrl({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'categorymembers',
    gcmtitle: title,
    gcmtype: 'file',
    gcmlimit: '50',
    prop: 'imageinfo|coordinates',
    iiprop: 'url|extmetadata|mime|size',
    iiextmetadatafilter: 'ImageDescription|DateTimeOriginal|Artist|LicenseShortName|Credit',
  }))
  return parseCommonsCategoryDraft({ categoryUrl, category, files })
}

function commonsApiTitle(categoryUrl: string): string {
  try {
    return decodeURIComponent(new URL(categoryUrl).pathname.replace(/^\/wiki\//, ''))
  } catch {
    return categoryUrl
  }
}

function commonsApiUrl(params: Record<string, string>): string {
  const url = new URL(COMMONS_API)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

async function defaultGetJson(url: string): Promise<WikimediaQuery> {
  const response = await fetch(url, { headers: { 'User-Agent': COMMONS_UA, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Commons API ${response.status} for ${url}`)
  return response.json() as Promise<WikimediaQuery>
}

export type CommonsIngest = {
  place: Place
  records: AtlasRecord[]
  relation?: Relation
}

export function mergeCommonsIngest(
  existing: { places: Place[]; records: AtlasRecord[]; relations: Relation[] },
  ingest: CommonsIngest,
): { places: Place[]; records: AtlasRecord[]; relations: Relation[] } {
  return mergeCommonsIngests(existing, [ingest])
}

export function mergeCommonsIngests(
  existing: { places: Place[]; records: AtlasRecord[]; relations: Relation[] },
  ingests: CommonsIngest[],
): { places: Place[]; records: AtlasRecord[]; relations: Relation[] } {
  return mergePlaceIngests(
    existing,
    ingests.map((ingest): PlaceIngest => ({
      place: ingest.place,
      records: ingest.records,
      relations: ingest.relation ? [ingest.relation] : [],
    })),
  )
}
