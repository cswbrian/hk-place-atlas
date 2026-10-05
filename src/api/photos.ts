import type { Bbox } from '../domain/featureQuery'
import type { Photo } from '../domain/photo'

export async function fetchPhotos(query: { featureId?: string; bbox?: Bbox }): Promise<Photo[]> {
  const params = new URLSearchParams()
  if (query.featureId) params.set('featureId', query.featureId)
  if (query.bbox) {
    params.set('bbox', `${query.bbox.west},${query.bbox.south},${query.bbox.east},${query.bbox.north}`)
  }
  const response = await fetch(`/api/photos?${params}`)
  if (!response.ok) throw new Error('Could not load photos')
  const body = (await response.json()) as { photos: Photo[] }
  return body.photos
}

export async function uploadPhoto(input: {
  featureId: string
  source: string
  remarks: string
  sourceUrl: string
  file: File
}): Promise<Photo> {
  const form = new FormData()
  form.set('featureId', input.featureId)
  form.set('source', input.source)
  form.set('remarks', input.remarks)
  form.set('sourceUrl', input.sourceUrl)
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
