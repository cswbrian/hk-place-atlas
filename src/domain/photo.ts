export const PHOTO_MAX_BYTES = 20 * 1024 * 1024
export const PHOTO_MAP_ZOOM = 17

export type PhotoUploadIssue = 'place' | 'source' | 'sourceUrl' | 'file'

export type PhotoUploadCheck = {
  featureId?: string | null
  source?: string | null
  remarks?: string | null
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
  remarks: string
  sourceUrl: string
  createdAt: string
  createdBy: string
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
  if (!(input.source?.trim())) issues.push('source')
  if (!httpsUrl(input.sourceUrl)) issues.push('sourceUrl')
  const size = input.byteLength ?? 0
  if (!Number.isFinite(size) || size <= 0 || size > PHOTO_MAX_BYTES) issues.push('file')
  return issues
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
