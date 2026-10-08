import type { Feature } from '../domain/feature'
import type { Bbox } from '../domain/featureQuery'
import type { RecentItem } from '../domain/recent'

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

export async function fetchCounts(): Promise<{ places: number; photos: number }> {
  const response = await fetch('/api/counts')
  if (!response.ok) throw new Error('Could not load counts')
  return (await response.json()) as { places: number; photos: number }
}

export async function fetchRecent(): Promise<RecentItem[]> {
  const response = await fetch('/api/recent')
  if (!response.ok) throw new Error('Could not load recent updates')
  const body = (await response.json()) as { features: RecentItem[] }
  return body.features
}

export async function fetchFeaturesInBbox(bbox: Bbox, kind?: string): Promise<Feature[]> {
  const params = new URLSearchParams({
    bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
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

export async function fetchOverlay(bbox: Bbox): Promise<Feature[]> {
  const params = new URLSearchParams({
    bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
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

export async function fetchSearch(q: string, kind?: string): Promise<Feature[]> {
  const params = new URLSearchParams({ q })
  if (kind) params.set('kind', kind)
  const response = await fetch(`/api/search?${params}`)
  if (!response.ok) throw new Error('Could not search')
  return (await response.json()) as Feature[]
}

export async function deleteFeature(slug: string, updatedAt: string): Promise<void> {
  const response = await fetch(`/api/features/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { 'If-Match': updatedAt },
  })
  if (response.status === 403) throw new Error('Seed catalog rows cannot be deleted')
  if (!response.ok) throw new Error('Could not delete')
}
