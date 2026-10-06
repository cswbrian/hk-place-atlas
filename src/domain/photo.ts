import type { PhotoTag } from './photoTag'
import { formatFuzzyDate } from './dates'

export const PHOTO_MAX_BYTES = 20 * 1024 * 1024
export const PHOTO_MAP_ZOOM = 17
export const PHOTO_YEAR_MIN = 1000
export const PHOTO_YEAR_MAX = 2100

export type PhotoUploadIssue = 'place' | 'file' | 'year'
export type PhotoMetaIssue = 'source' | 'sourceUrl' | 'year'

export type PhotoUploadCheck = {
  featureId?: string | null
  source?: string | null
  caption?: string | null
  photographer?: string | null
  license?: string | null
  year?: unknown
  circa?: unknown
  sourceUrl?: string | null
  byteLength?: number | null
  placeFound?: boolean
  placeLng?: number | null
  placeLat?: number | null
}

export type Photo = {
  id: string
  featureId: string
  lng: number
  lat: number
  source: string
  caption: string
  photographer: string
  license: string
  year: number | null
  circa: boolean
  sourceUrl: string
  createdAt: string
  createdBy: string
  tags: PhotoTag[]
}

export type PhotoPin = {
  id: string
  featureId: string
  lng: number
  lat: number
}

export type MapThumb = {
  id: string
  featureId: string
  lng: number
  lat: number
  count: number
}

export function normalizePhotoTaken(input: {
  year?: unknown
  circa?: unknown
}): { year: number | null; circa: boolean } | { error: 'year' } {
  const raw = input.year
  if (raw == null || raw === '') {
    return { year: null, circa: false }
  }
  const text = typeof raw === 'string' ? raw.trim() : raw
  if (text === '') return { year: null, circa: false }
  const n = typeof text === 'number' ? text : Number(text)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < PHOTO_YEAR_MIN || n > PHOTO_YEAR_MAX) {
    return { error: 'year' }
  }
  return { year: n, circa: truthyFlag(input.circa) }
}

export function formatPhotoTaken(year: number | null, circa: boolean): string | null {
  if (year == null) return null
  return formatFuzzyDate({ year, circa })
}

export function photoDetailText(value: string | null | undefined): string {
  const text = value?.trim() ?? ''
  return text || '-'
}

export function photoDetailUrlHost(value: string | null | undefined): string {
  const text = value?.trim() ?? ''
  if (!text) return '-'
  try {
    const host = new URL(text).hostname
    return host || '-'
  } catch {
    return '-'
  }
}

export function photoUploadIssues(input: PhotoUploadCheck): PhotoUploadIssue[] {
  const issues: PhotoUploadIssue[] = []
  const featureId = input.featureId?.trim() ?? ''
  const located =
    input.placeFound !== false &&
    featureId.length > 0 &&
    input.placeLng != null &&
    input.placeLat != null &&
    Number.isFinite(input.placeLng) &&
    Number.isFinite(input.placeLat)
  if (!located) issues.push('place')
  const taken = normalizePhotoTaken({ year: input.year, circa: input.circa })
  if ('error' in taken) issues.push('year')
  const size = input.byteLength ?? 0
  if (!Number.isFinite(size) || size <= 0 || size > PHOTO_MAX_BYTES) issues.push('file')
  return issues
}

export function photoMetaComplete(input: {
  source?: string | null
  sourceUrl?: string | null
}): boolean {
  return photoMetaIssues({ source: input.source, sourceUrl: input.sourceUrl }).length === 0
}

export function photoObjectKeys(id: string): { original: string; map: string; panel: string } {
  return {
    original: `photos/${id}/original`,
    map: `photos/${id}/map.webp`,
    panel: `photos/${id}/panel.webp`,
  }
}

export function thumbPath(id: string, size: 'map' | 'panel'): string {
  return `/api/photos/${encodeURIComponent(id)}/thumb?size=${size}`
}

export function mergeSitePhotos(lists: Photo[][]): Photo[] {
  const seen = new Set<string>()
  const merged: Photo[] = []
  for (const list of lists) {
    for (const photo of list) {
      if (seen.has(photo.id)) continue
      seen.add(photo.id)
      merged.push(photo)
    }
  }
  return merged
}

export function mapThumbs(photos: PhotoPin[], zoom: number): MapThumb[] {
  if (zoom < PHOTO_MAP_ZOOM) return []
  const groups = new Map<string, PhotoPin[]>()
  for (const photo of photos) {
    const group = groups.get(photo.featureId) ?? []
    group.push(photo)
    groups.set(photo.featureId, group)
  }
  const thumbs: MapThumb[] = []
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id))
    const anchor = sorted[0]!
    thumbs.push({
      id: anchor.id,
      featureId: anchor.featureId,
      lng: anchor.lng,
      lat: anchor.lat,
      count: sorted.length,
    })
  }
  return thumbs
}

export function photoMetaIssues(input: {
  source?: string | null
  caption?: string | null
  photographer?: string | null
  license?: string | null
  sourceUrl?: string | null
  year?: unknown
  circa?: unknown
}): PhotoMetaIssue[] {
  const issues: PhotoMetaIssue[] = []
  if (!(input.source?.trim())) issues.push('source')
  if (!httpsUrl(input.sourceUrl)) issues.push('sourceUrl')
  const taken = normalizePhotoTaken({ year: input.year, circa: input.circa })
  if ('error' in taken) issues.push('year')
  return issues
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function httpsUrl(value: string | null | undefined): boolean {
  const text = value?.trim() ?? ''
  if (!text.toLowerCase().startsWith('https://')) return false
  try {
    const url = new URL(text)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}
