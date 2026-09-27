import type { Feature } from '../domain/feature'
import type { Bbox } from '../domain/featureQuery'
import type { AuditEntry } from '../domain/audit'
import type { PlacesListResponse } from '../domain/placesQuery'
import type { SiteLocale } from '../domain/locale'

export type { AuditEntry }

export type FeatureEdge = {
  id: string
  from_type: string
  from_id: string
  to_type: string
  to_id: string
  rel_type: string
  note: string | null
  valid_from: string | null
  valid_to: string | null
}

export async function fetchFeatureBySlug(slug: string): Promise<Feature | null> {
  const response = await fetch(`/api/features/${encodeURIComponent(slug)}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Could not load feature')
  return (await response.json()) as Feature
}

export async function fetchPlaces(input: {
  locale: SiteLocale
  page?: number
  letter?: string | null
  q?: string | null
  region?: string | null
  district?: string | null
  decade?: number | null
}): Promise<PlacesListResponse> {
  const params = new URLSearchParams({ locale: input.locale })
  if (input.page && input.page > 1) params.set('page', String(input.page))
  if (input.q?.trim()) params.set('q', input.q.trim())
  else if (input.letter) params.set('letter', input.letter)
  if (input.region) params.set('region', input.region)
  if (input.district) params.set('district', input.district)
  if (input.decade) params.set('decade', String(input.decade))
  const response = await fetch(`/api/places?${params}`)
  if (!response.ok) throw new Error('Could not load places')
  return (await response.json()) as PlacesListResponse
}

export async function fetchFeaturesInBbox(bbox: Bbox, year: number, kind?: string): Promise<Feature[]> {
  const params = new URLSearchParams({
    bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
    year: String(year),
  })
  if (kind) params.set('kind', kind)
  const response = await fetch(`/api/features?${params}`)
  if (!response.ok) throw new Error('Could not load features')
  return (await response.json()) as Feature[]
}

export async function fetchEdges(featureId: string): Promise<FeatureEdge[]> {
  const response = await fetch(`/api/edges?featureId=${encodeURIComponent(featureId)}`)
  if (!response.ok) throw new Error('Could not load edges')
  return (await response.json()) as FeatureEdge[]
}

export type AtlasUser = { sub: string; email: string }

export async function fetchMe(): Promise<{ user: AtlasUser | null; auth: boolean }> {
  const response = await fetch('/api/me')
  if (!response.ok) return { user: null, auth: false }
  return (await response.json()) as { user: AtlasUser | null; auth: boolean }
}

export async function fetchOverlay(bbox: Bbox, year: number): Promise<Feature[]> {
  const params = new URLSearchParams({
    bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
    year: String(year),
  })
  const response = await fetch(`/api/overlay?${params}`)
  if (!response.ok) throw new Error('Could not load overlay')
  return (await response.json()) as Feature[]
}

export async function saveFeature(write: unknown, slug?: string, updatedAt?: string): Promise<Feature> {
  const response = await fetch(slug ? `/api/features/${encodeURIComponent(slug)}` : '/api/features', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...(updatedAt ? { 'If-Match': updatedAt } : {}),
    },
    body: JSON.stringify(write),
  })
  if (response.status === 401) throw new Error('Sign in required')
  if (response.status === 429) throw new Error('Too many writes this hour')
  if (response.status === 412) throw new Error('This record changed — reload and try again')
  if (!response.ok) throw new Error('Could not save')
  return (await response.json()) as Feature
}

export async function fetchSearch(q: string, year?: number, kind?: string): Promise<Feature[]> {
  const params = new URLSearchParams({ q })
  if (year != null && Number.isInteger(year)) params.set('year', String(year))
  if (kind) params.set('kind', kind)
  const response = await fetch(`/api/search?${params}`)
  if (!response.ok) throw new Error('Could not search')
  return (await response.json()) as Feature[]
}

export async function fetchAudit(featureId: string): Promise<AuditEntry[]> {
  const response = await fetch(`/api/audit?featureId=${encodeURIComponent(featureId)}`)
  if (!response.ok) throw new Error('Could not load history')
  return (await response.json()) as AuditEntry[]
}

export async function revertAudit(id: string, updatedAt?: string): Promise<Feature | { deleted: true }> {
  const response = await fetch(`/api/audit/${encodeURIComponent(id)}/revert`, {
    method: 'POST',
    headers: updatedAt ? { 'If-Match': updatedAt } : {},
  })
  if (response.status === 401) throw new Error('Sign in required')
  if (response.status === 429) throw new Error('Too many writes this hour')
  if (response.status === 412) throw new Error('This record changed — reload and try again')
  if (response.status === 403) throw new Error('Seed catalog rows cannot be deleted')
  if (!response.ok) throw new Error('Could not revert')
  return (await response.json()) as Feature | { deleted: true }
}

export async function deleteFeature(slug: string, updatedAt: string): Promise<void> {
  const response = await fetch(`/api/features/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { 'If-Match': updatedAt },
  })
  if (response.status === 403) throw new Error('Seed catalog rows cannot be deleted')
  if (!response.ok) throw new Error('Could not delete')
}
