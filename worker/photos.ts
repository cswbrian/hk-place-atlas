import {
  photoObjectKeys,
  photoUploadIssues,
  type Photo,
  type PhotoUploadIssue,
} from '../src/domain/photo'

export const MAP_EDGE = 96
export const PANEL_EDGE = 960

export type PlacePoint = {
  id: string
  lng: number | null
  lat: number | null
}

export type StoredPhoto = {
  id: string
  featureId: string
  lng: number
  lat: number
  source: string
  remarks: string
  sourceUrl: string
  originalKey: string
  mapKey: string
  panelKey: string
  createdAt: string
  createdBy: string
}

export type PhotoBucket = {
  findPlace(id: string): Promise<PlacePoint | null>
  put(key: string, body: ArrayBuffer, contentType: string): Promise<void>
  delete(key: string): Promise<void>
  insert(row: StoredPhoto): Promise<void>
  deleteRow(id: string): Promise<void>
  inspect(bytes: ArrayBuffer): Promise<boolean>
  thumbnail(bytes: ArrayBuffer, edge: number): Promise<ArrayBuffer>
}

export type PhotoCreateInput = {
  id: string
  featureId: string
  source: string
  remarks: string
  sourceUrl: string
  bytes: ArrayBuffer
  createdAt: string
  createdBy: string
}

export function toPublicPhoto(row: StoredPhoto): Photo {
  return {
    id: row.id,
    featureId: row.featureId,
    lng: row.lng,
    lat: row.lat,
    source: row.source,
    remarks: row.remarks,
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  }
}

export async function createPhoto(
  store: PhotoBucket,
  input: PhotoCreateInput,
): Promise<{ ok: true; photo: Photo } | { ok: false; error: PhotoUploadIssue | 'store' }> {
  const place = await store.findPlace(input.featureId.trim())
  const issues = photoUploadIssues({
    featureId: input.featureId,
    source: input.source,
    remarks: input.remarks,
    sourceUrl: input.sourceUrl,
    byteLength: input.bytes.byteLength,
    placeFound: place != null,
    placeLng: place?.lng,
    placeLat: place?.lat,
  })
  if (issues.length > 0) return { ok: false, error: issues[0]! }
  const image = await store.inspect(input.bytes)
  if (!image) return { ok: false, error: 'file' }
  if (place?.lng == null || place.lat == null) return { ok: false, error: 'place' }

  const keys = photoObjectKeys(input.id)
  const written: string[] = []
  try {
    await store.put(keys.original, input.bytes, 'application/octet-stream')
    written.push(keys.original)
    const mapThumb = await store.thumbnail(input.bytes, MAP_EDGE)
    await store.put(keys.map, mapThumb, 'image/webp')
    written.push(keys.map)
    const panelThumb = await store.thumbnail(input.bytes, PANEL_EDGE)
    await store.put(keys.panel, panelThumb, 'image/webp')
    written.push(keys.panel)
    const row: StoredPhoto = {
      id: input.id,
      featureId: place.id,
      lng: place.lng,
      lat: place.lat,
      source: input.source.trim(),
      remarks: input.remarks.trim(),
      sourceUrl: input.sourceUrl.trim(),
      originalKey: keys.original,
      mapKey: keys.map,
      panelKey: keys.panel,
      createdAt: input.createdAt,
      createdBy: input.createdBy,
    }
    await store.insert(row)
    return { ok: true, photo: toPublicPhoto(row) }
  } catch {
    await Promise.all(written.map((key) => store.delete(key)))
    return { ok: false, error: 'store' }
  }
}

export async function removePhoto(
  store: Pick<PhotoBucket, 'delete' | 'deleteRow'>,
  photo: Pick<StoredPhoto, 'id' | 'createdBy' | 'originalKey' | 'mapKey' | 'panelKey'>,
  actorSub: string,
): Promise<'ok' | 'forbidden'> {
  if (photo.createdBy !== actorSub) return 'forbidden'
  await Promise.all([
    store.delete(photo.originalKey),
    store.delete(photo.mapKey),
    store.delete(photo.panelKey),
  ])
  await store.deleteRow(photo.id)
  return 'ok'
}
