import { yearOnlyIfDefaultJan1 } from './dates.ts'
import type { FuzzyDate, PlaceStatus } from './types'
import type { PlaceSourceDraft } from './ingest'

export function gwuloPlaceId(urlOrPath: string): string {
  const match = urlOrPath.match(/\/node\/(\d+)/)
  if (match?.[1]) return `gwulo-${match[1]}`
  const digits = urlOrPath.match(/(\d+)/)
  return digits?.[1] ? `gwulo-${digits[1]}` : 'gwulo-unknown'
}

export function parseGwuloPlaceHtml(html: string, url: string): PlaceSourceDraft {
  const nodeId = gwuloPlaceId(url).replace(/^gwulo-/, '')
  const heading = stripTags(matchOne(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? '').trim()
  const title = heading.replace(/\s*\[[^\]]*\]\s*$/, '').trim() || heading
  const condition = stripTags(fieldHtml(html, 'field-current-condition')).trim()
  const built = parseGwuloTime(html, 'field-date-completed')
  const demolished = parseGwuloTime(html, 'field-date-demolished')
  const pin = leafletPoint(html)
  const laterChunkIndex = html.search(/field--name-field-later-places/i)
  const laterFrom = laterChunkIndex >= 0 ? html.slice(laterChunkIndex) : ''
  const laterStop = laterFrom.search(/node__links|field--name-field-(?!later-places)/i)
  const laterChunk = laterStop >= 0 ? laterFrom.slice(0, laterStop) : laterFrom.slice(0, 2000)
  const laterPlaceTitles = [...laterChunk.matchAll(/<a[^>]*href="\/node\/[^"]+"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((link) => stripTags(link[1] ?? '').replace(/\s*\[[^\]]*\]\s*$/, '').trim())
    .filter(Boolean)
  const body = fieldHtml(html, 'body')
  const firstParagraph = stripTags(matchOne(body, /<p[^>]*>([\s\S]*?)<\/p>/i) ?? body).trim()
  return {
    kind: 'gwulo',
    url,
    proposedId: gwuloPlaceId(url),
    names: title ? [{ lang: 'en', text: title, primary: true }] : [],
    status: gwuloStatus(condition),
    built,
    demolished,
    lat: pin?.lat,
    lng: pin?.lng,
    notes: firstParagraph,
    laterPlaceTitles,
    sources: [{ label: `Gwulo ${nodeId}`, url }],
    customFields: nodeId === 'unknown' ? [] : [{ key: 'gwuloNode', value: nodeId }],
  }
}

export async function fetchGwuloPlace(
  url: string,
  getText: (url: string) => Promise<string> = defaultGetText,
): Promise<PlaceSourceDraft> {
  return parseGwuloPlaceHtml(await getText(url), url)
}

const GWULO_UA = 'HKPlaceAtlas/0.0 (local historical map; gwulo ingest)'

async function defaultGetText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': GWULO_UA, Accept: 'text/html' } })
  if (!response.ok) throw new Error(`Gwulo ${response.status} for ${url}`)
  return response.text()
}

function gwuloStatus(condition: string): PlaceStatus {
  if (/demolished|no longer exists/i.test(condition)) return 'demolished'
  if (/in use|exists/i.test(condition)) return 'standing'
  return 'unknown'
}

function parseGwuloTime(html: string, fieldName: string): FuzzyDate | null {
  const chunk = fieldHtml(html, fieldName)
  const iso = matchOne(chunk, /datetime="([^"]+)"/i)
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  return yearOnlyIfDefaultJan1({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  })
}

function leafletPoint(html: string): { lat: number; lng: number } | undefined {
  const raw = matchOne(html, /data-drupal-selector="drupal-settings-json">([^<]+)/i)
  if (!raw) return undefined
  try {
    const data = JSON.parse(raw) as { leaflet?: { 'leaflet-map'?: { features?: unknown } } }
    const point = firstLeafletPoint(data.leaflet?.['leaflet-map']?.features)
    return point
  } catch {
    return undefined
  }
}

function firstLeafletPoint(value: unknown): { lat: number; lng: number } | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstLeafletPoint(item)
      if (found) return found
    }
    return undefined
  }
  if (typeof value !== 'object') return undefined
  const record = value as { type?: string; lat?: number; lon?: number; lng?: number; features?: unknown }
  if (record.type === 'point' && typeof record.lat === 'number') {
    const lng = typeof record.lon === 'number' ? record.lon : record.lng
    if (typeof lng === 'number') return { lat: record.lat, lng }
  }
  return firstLeafletPoint(record.features)
}

function fieldHtml(html: string, fieldName: string): string {
  const start = html.search(new RegExp(`field--name-${fieldName}\\b`, 'i'))
  if (start < 0) return ''
  return html.slice(start, start + 800)
}

function matchOne(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern)
  return match?.[1]
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
