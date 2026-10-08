import { slugify, uniqueSlug, type Feature, type FeatureBody, type FeatureKind, type FeatureStatus } from './feature'
import type { FuzzyDate, Source } from './types'

export type FeatureWrite = {
  kind: FeatureKind
  nameEn: string
  nameZh: string
  status: FeatureStatus
  start: FuzzyDate | null
  end: FuzzyDate | null
  lng: number | null
  lat: number | null
  body: FeatureBody
}

export type WikiActor = { sub: string; email: string }

const WRITE_KINDS: FeatureKind[] = ['establishment', 'shop', 'event']
const STATUSES: FeatureStatus[] = ['standing', 'demolished', 'unknown']
export const WRITE_HOUR_CAP = 30

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFuzzy(value: unknown): FuzzyDate | null {
  if (value == null) return null
  if (!isRecord(value) || typeof value.year !== 'number') return null
  return {
    year: value.year,
    month: typeof value.month === 'number' ? value.month : undefined,
    day: typeof value.day === 'number' ? value.day : undefined,
    circa: value.circa === true ? true : undefined,
  }
}

const MAX_SOURCES = 20
const MAX_LABEL = 120
const MAX_SITE_NAME = 80
const MAX_URL = 2048

function trimCap(value: string, max: number): string {
  const trimmed = value.trim()
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max)
}

function httpUrl(value: unknown, httpsOnly = false): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_URL) return undefined
  try {
    const parsed = new URL(trimmed)
    if (httpsOnly) {
      if (parsed.protocol !== 'https:') return undefined
    } else if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined
    }
    return trimmed
  } catch {
    return undefined
  }
}

function parseSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return []
  const sources: Source[] = []
  for (const item of value) {
    if (sources.length >= MAX_SOURCES) break
    if (!isRecord(item)) continue
    const url = httpUrl(item.url)
    if (!url) continue
    const label = typeof item.label === 'string' ? trimCap(item.label, MAX_LABEL) : undefined
    const siteName = typeof item.siteName === 'string' ? trimCap(item.siteName, MAX_SITE_NAME) : undefined
    const icon = httpUrl(item.icon, true)
    sources.push({
      url,
      ...(label ? { label } : {}),
      ...(siteName ? { siteName } : {}),
      ...(icon ? { icon } : {}),
    })
  }
  return sources
}

export function parseFeatureWrite(body: unknown): FeatureWrite | { error: string } {
  if (!isRecord(body)) return { error: 'invalid body' }
  if (!WRITE_KINDS.includes(body.kind as FeatureKind)) return { error: 'kind required' }
  const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : ''
  if (!nameEn) return { error: 'name required' }
  const status = STATUSES.includes(body.status as FeatureStatus) ? (body.status as FeatureStatus) : 'unknown'
  const lng = typeof body.lng === 'number' ? body.lng : null
  const lat = typeof body.lat === 'number' ? body.lat : null
  const rawBody = isRecord(body.body) ? body.body : {}
  return {
    kind: body.kind as FeatureKind,
    nameEn,
    nameZh: typeof body.nameZh === 'string' ? body.nameZh.trim() : '',
    status,
    start: parseFuzzy(body.start),
    end: parseFuzzy(body.end),
    lng,
    lat,
    body: {
      notes: typeof rawBody.notes === 'string' ? rawBody.notes : '',
      sources: parseSources(rawBody.sources),
      images: parseSources(rawBody.images),
      tags: Array.isArray(rawBody.tags) ? rawBody.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      customFields: Array.isArray(rawBody.customFields)
        ? rawBody.customFields.flatMap((field) => {
            if (!isRecord(field) || typeof field.key !== 'string' || typeof field.value !== 'string') return []
            return [{ key: field.key, value: field.value }]
          })
        : [],
      district: typeof rawBody.district === 'string' ? rawBody.district : undefined,
      region: typeof rawBody.region === 'string' ? rawBody.region : undefined,
    },
  }
}

export function checkIfMatch(updatedAt: string, ifMatch: string | null): 'ok' | 'missing' | 'conflict' {
  if (!ifMatch) return 'missing'
  const stamp = ifMatch.replaceAll('"', '').trim()
  return stamp === updatedAt ? 'ok' : 'conflict'
}

export function rateLimitOk(writeCountInHour: number, cap = WRITE_HOUR_CAP): boolean {
  return writeCountInHour <= cap
}

export function wikiCanDelete(id: string): boolean {
  return id.startsWith('wiki-')
}

export function wikiSlug(nameEn: string, year: number | null | undefined, used: Set<string>): string {
  return uniqueSlug(slugify(nameEn, year), used)
}

export function applyWikiWrite(
  existing: Feature | null,
  write: FeatureWrite,
  actor: WikiActor,
  id: string,
  slug: string,
  now: string,
): Feature {
  return {
    id,
    kind: write.kind,
    slug,
    nameEn: write.nameEn,
    nameZh: write.nameZh,
    status: write.status,
    start: write.start,
    end: write.end,
    lng: write.lng,
    lat: write.lat,
    body: write.body,
    touched: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? actor.sub,
    updatedBy: actor.sub,
  }
}
