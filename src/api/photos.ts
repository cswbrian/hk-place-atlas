import type { Bbox } from '../domain/featureQuery'
import type { Photo } from '../domain/photo'
import type { PhotoTag } from '../domain/photoTag'

export function originalPath(id: string): string {
  return `/api/photos/${encodeURIComponent(id)}/file`
}

export async function fetchPhotos(query: { featureId?: string; bbox?: Bbox }): Promise<Photo[]> {
  const params = new URLSearchParams()
  if (query.featureId) params.set('featureId', query.featureId)
  if (query.bbox) {
    params.set('bbox', `${query.bbox.west},${query.bbox.south},${query.bbox.east},${query.bbox.north}`)
  }
  const response = await fetch(`/api/photos?${params}`)
  if (!response.ok) throw new Error('Could not load photos')
  const body = (await response.json()) as { photos: Photo[] }
  return body.photos.map((photo) => ({
    ...photo,
    caption: photo.caption ?? '',
    photographer: photo.photographer ?? '',
    license: photo.license ?? '',
    year: photo.year ?? null,
    circa: Boolean(photo.circa),
    tags: photo.tags ?? [],
  }))
}

export async function uploadPhoto(input: { featureId: string; file: File }): Promise<Photo> {
  const form = new FormData()
  form.set('featureId', input.featureId)
  form.set('file', input.file)
  const response = await fetch('/api/photos', { method: 'POST', body: form })
  const body = (await response.json()) as Photo & { error?: string }
  if (!response.ok) throw new Error(body.error || 'upload failed')
  return body
}

export async function deletePhoto(id: string): Promise<void> {
  const response = await fetch(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || 'delete failed')
  }
}

export async function updatePhoto(input: {
  id: string
  source: string
  caption: string
  photographer: string
  license: string
  year: number | null
  circa: boolean
  sourceUrl: string
}): Promise<Photo> {
  const response = await fetch(`/api/photos/${encodeURIComponent(input.id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: input.source,
      caption: input.caption,
      photographer: input.photographer,
      license: input.license,
      year: input.year,
      circa: input.circa,
      sourceUrl: input.sourceUrl,
    }),
  })
  const body = (await response.json()) as Photo & { error?: string }
  if (!response.ok) throw new Error(body.error || 'update failed')
  return { ...body, tags: body.tags ?? [] }
}

export async function savePhotoTag(input: {
  photoId: string
  featureId: string
  x: number
  y: number
}): Promise<PhotoTag> {
  const response = await fetch(`/api/photos/${encodeURIComponent(input.photoId)}/tags`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ featureId: input.featureId, x: input.x, y: input.y }),
  })
  const body = (await response.json()) as PhotoTag & { error?: string }
  if (!response.ok) throw new Error(body.error || 'tag failed')
  return body
}

export async function deletePhotoTag(photoId: string, tagId: string): Promise<void> {
  const response = await fetch(
    `/api/photos/${encodeURIComponent(photoId)}/tags/${encodeURIComponent(tagId)}`,
    { method: 'DELETE' },
  )
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || 'tag failed')
  }
}
