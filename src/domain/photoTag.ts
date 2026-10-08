export type PhotoTag = {
  id: string
  featureId: string
  nameEn: string
  nameZh: string
  slug: string
  kind: string
  x: number
  y: number
}

export type PhotoTagIssue = 'place' | 'point'

export const PHOTO_TAG_UPSERT = `INSERT INTO photo_tags (
  id, photo_id, feature_id, x, y, created_at, created_by
) VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(photo_id, feature_id) DO UPDATE SET
  x = excluded.x,
  y = excluded.y,
  created_at = excluded.created_at,
  created_by = excluded.created_by`

export const DELETE_PHOTO_TAGS = 'DELETE FROM photo_tags WHERE photo_id = ?'
export const DELETE_PLACE_TAGS = 'DELETE FROM photo_tags WHERE feature_id = ?'

export function photoTagIssues(input: {
  featureId?: string | null
  x?: unknown
  y?: unknown
}): PhotoTagIssue[] {
  const issues: PhotoTagIssue[] = []
  if (!(input.featureId?.trim())) issues.push('place')
  const x = input.x
  const y = input.y
  const onImage =
    typeof x === 'number' &&
    typeof y === 'number' &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 0 &&
    x <= 1 &&
    y >= 0 &&
    y <= 1
  if (!onImage) issues.push('point')
  return issues
}

export function imageMediaType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

type Point = { x: number; y: number }
type Frame = { left: number; top: number; width: number; height: number }
type Size = { width: number; height: number }

function imageFraction(client: Point, frame: Frame, natural: Size): Point | null {
  if (frame.width <= 0 || frame.height <= 0 || natural.width <= 0 || natural.height <= 0) return null
  const scale = Math.min(frame.width / natural.width, frame.height / natural.height)
  const renderedW = natural.width * scale
  const renderedH = natural.height * scale
  const originX = frame.left + (frame.width - renderedW) / 2
  const originY = frame.top + (frame.height - renderedH) / 2
  return { x: (client.x - originX) / renderedW, y: (client.y - originY) / renderedH }
}

export function imageClickFraction(click: Point, frame: Frame, natural: Size): Point | null {
  const point = imageFraction(click, frame, natural)
  if (!point || point.x < 0 || point.y < 0 || point.x > 1 || point.y > 1) return null
  return point
}

export function dragTagPoint(tag: Point, start: Point, current: Point, frame: Frame, natural: Size): Point | null {
  const from = imageFraction(start, frame, natural)
  const to = imageFraction(current, frame, natural)
  if (!from || !to) return null
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  return { x: clamp(tag.x + to.x - from.x), y: clamp(tag.y + to.y - from.y) }
}

export function pinLabelPosition(x: number, y: number): { left: string; top: string; transform: string } {
  const shiftX = x > 0.65 ? '-100%' : '0'
  const shiftY = y > 0.75 ? '-100%' : '0'
  return {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    transform: `translate(${shiftX}, ${shiftY})`,
  }
}

export function photoListFilter(input: {
  featureId?: string | null
  bbox?: { west: number; east: number; south: number; north: number } | null
}): { sql: string; binds: (string | number)[] } {
  const parts: string[] = []
  const binds: (string | number)[] = []
  if (input.featureId) {
    parts.push('(feature_id = ? OR id IN (SELECT photo_id FROM photo_tags WHERE feature_id = ?))')
    binds.push(input.featureId, input.featureId)
  }
  if (input.bbox) {
    parts.push('lng >= ? AND lng <= ? AND lat >= ? AND lat <= ?')
    binds.push(input.bbox.west, input.bbox.east, input.bbox.south, input.bbox.north)
  }
  return { sql: parts.length ? ` AND ${parts.join(' AND ')}` : '', binds }
}

export function attachPhotoTags<T extends { id: string }>(
  photos: T[],
  tags: (PhotoTag & { photoId: string })[],
): (T & { tags: PhotoTag[] })[] {
  const byPhoto = new Map<string, PhotoTag[]>()
  for (const tag of tags) {
    const { photoId, ...pin } = tag
    const list = byPhoto.get(photoId) ?? []
    list.push(pin)
    byPhoto.set(photoId, list)
  }
  return photos.map((photo) => ({ ...photo, tags: byPhoto.get(photo.id) ?? [] }))
}
