import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PHOTO_TAG_UPSERT,
  attachPhotoTags,
  dragTagPoint,
  imageClickFraction,
  imageMediaType,
  photoListFilter,
  photoTagIssues,
  pinLabelPosition,
} from './photoTag'

describe('photoTagIssues', () => {
  it('accepts a place and a point on the image', () => {
    expect(photoTagIssues({ featureId: 'place-1', x: 0, y: 1 })).toEqual([])
  })

  it('requires a place and a point inside the image', () => {
    expect(photoTagIssues({ featureId: '  ', x: 0.2, y: 0.2 })).toContain('place')
    expect(photoTagIssues({ featureId: 'place-1', x: -0.01, y: 0.2 })).toContain('point')
    expect(photoTagIssues({ featureId: 'place-1', x: 1.1, y: 0.2 })).toContain('point')
    expect(photoTagIssues({ featureId: 'place-1', x: 0.2, y: Number.NaN })).toContain('point')
  })
})

describe('imageMediaType', () => {
  it('reads jpeg, png, gif, and webp signatures', () => {
    expect(imageMediaType(Uint8Array.of(0xff, 0xd8, 0xff, 0x00))).toBe('image/jpeg')
    expect(imageMediaType(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
    expect(imageMediaType(Uint8Array.of(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe('image/gif')
    const webp = Uint8Array.of(
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    )
    expect(imageMediaType(webp)).toBe('image/webp')
  })

  it('rejects a file that is not one of those images', () => {
    expect(imageMediaType(Uint8Array.of(0x00, 0x01, 0x02, 0x03))).toBeNull()
  })
})

describe('imageClickFraction', () => {
  const frame = { left: 0, top: 0, width: 200, height: 100 }
  const natural = { width: 100, height: 100 }

  it('measures a click on the fitted picture', () => {
    expect(imageClickFraction({ x: 50, y: 0 }, frame, natural)).toEqual({ x: 0, y: 0 })
    expect(imageClickFraction({ x: 150, y: 50 }, frame, natural)).toEqual({ x: 1, y: 0.5 })
  })

  it('ignores a click in the empty space around the picture', () => {
    expect(imageClickFraction({ x: 10, y: 10 }, frame, natural)).toBeNull()
  })
})

describe('dragTagPoint', () => {
  const frame = { left: 0, top: 0, width: 200, height: 100 }
  const natural = { width: 100, height: 100 }

  it('moves the tag by the drag distance, keeping where it was grabbed', () => {
    const point = dragTagPoint({ x: 0.2, y: 0.2 }, { x: 80, y: 30 }, { x: 100, y: 50 }, frame, natural)
    expect(point?.x).toBeCloseTo(0.4)
    expect(point?.y).toBeCloseTo(0.4)
  })

  it('keeps the tag on the picture when dragged past the edge', () => {
    expect(dragTagPoint({ x: 0.9, y: 0.1 }, { x: 140, y: 10 }, { x: 199, y: -40 }, frame, natural)).toEqual({
      x: 1,
      y: 0,
    })
  })
})

describe('pinLabelPosition', () => {
  it('anchors the label on the point and shifts it inward near the edges', () => {
    expect(pinLabelPosition(0.2, 0.3)).toEqual({
      left: '20%',
      top: '30%',
      transform: 'translate(0, 0)',
    })
    expect(pinLabelPosition(0.9, 0.9).transform).toBe('translate(-100%, -100%)')
  })
})

describe('photoListFilter', () => {
  it('includes photos uploaded to a place and photos pinned to it', () => {
    expect(photoListFilter({ featureId: 'place-1' })).toEqual({
      sql: ' AND (feature_id = ? OR id IN (SELECT photo_id FROM photo_tags WHERE feature_id = ?))',
      binds: ['place-1', 'place-1'],
    })
  })

  it('keeps a map query on the photo point', () => {
    expect(
      photoListFilter({
        bbox: { west: 114, east: 115, south: 22, north: 23 },
      }),
    ).toEqual({
      sql: ' AND lng >= ? AND lng <= ? AND lat >= ? AND lat <= ?',
      binds: [114, 115, 22, 23],
    })
  })
})

describe('attachPhotoTags', () => {
  it('gives an existing photo an empty pin list', () => {
    expect(attachPhotoTags([{ id: 'pic-1', source: 'SCMP' }], [])).toEqual([
      { id: 'pic-1', source: 'SCMP', tags: [] },
    ])
  })

  it('attaches place names and drops the photo id used for grouping', () => {
    const [photo] = attachPhotoTags([{ id: 'pic-1' }], [
      {
        photoId: 'pic-1',
        id: 'tag-1',
        featureId: 'place-2',
        nameEn: 'Market',
        nameZh: '街市',
        slug: 'market',
        kind: 'establishment',
        x: 0.2,
        y: 0.4,
      },
    ])
    expect(photo?.tags).toEqual([
      {
        id: 'tag-1',
        featureId: 'place-2',
        nameEn: 'Market',
        nameZh: '街市',
        slug: 'market',
        kind: 'establishment',
        x: 0.2,
        y: 0.4,
      },
    ])
  })
})

describe('PHOTO_TAG_UPSERT', () => {
  it('moves the pin when that place is already on the photo', () => {
    expect(PHOTO_TAG_UPSERT).toContain('ON CONFLICT(photo_id, feature_id) DO UPDATE SET')
    expect(PHOTO_TAG_UPSERT).toContain('x = excluded.x')
    expect(PHOTO_TAG_UPSERT).toContain('y = excluded.y')
    expect(PHOTO_TAG_UPSERT).toContain('created_by = excluded.created_by')
  })
})

describe('0006_photo_tags', () => {
  const sql = readFileSync(new URL('../../worker/migrations/0006_photo_tags.sql', import.meta.url), 'utf8')

  it('adds photo_tags and does not alter the photos table', () => {
    expect(sql).toContain('CREATE TABLE photo_tags')
    expect(sql).toContain('UNIQUE (photo_id, feature_id)')
    expect(sql.toLowerCase()).not.toContain('alter table photos')
    expect(sql.toLowerCase()).not.toContain('drop table photos')
  })
})
