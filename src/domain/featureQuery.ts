import type { Feature, FeatureBody, FeatureKind, FeatureStatus } from './feature'
import type { FuzzyDate } from './types'

export type Bbox = { west: number; south: number; east: number; north: number }

export type FeatureRow = {
  id: string
  kind: string
  slug: string
  name_en: string
  name_zh: string
  status: string
  start_year: number | null
  start_month: number | null
  start_day: number | null
  start_circa: number
  end_year: number | null
  end_month: number | null
  end_day: number | null
  end_circa: number
  lng: number | null
  lat: number | null
  body: string
  touched: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export function parseBbox(value: string | null): Bbox | null {
  if (!value) return null
  const parts = value.split(',').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [west, south, east, north] = parts as [number, number, number, number]
  return { west, south, east, north }
}

export function featureInBbox(
  lng: number | null,
  lat: number | null,
  bbox: Bbox,
): boolean {
  if (lng == null || lat == null) return false
  return lng >= bbox.west && lng <= bbox.east && lat >= bbox.south && lat <= bbox.north
}

function fuzzyFromRow(
  year: number | null,
  month: number | null,
  day: number | null,
  circa: number,
): FuzzyDate | null {
  if (year == null) return null
  return {
    year,
    month: month ?? undefined,
    day: day ?? undefined,
    circa: circa ? true : undefined,
  }
}

export function featureRowToFeature(row: FeatureRow): Feature {
  const parsed = JSON.parse(row.body) as FeatureBody
  return {
    id: row.id,
    kind: row.kind as FeatureKind,
    slug: row.slug,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    status: row.status as FeatureStatus,
    start: fuzzyFromRow(row.start_year, row.start_month, row.start_day, row.start_circa),
    end: fuzzyFromRow(row.end_year, row.end_month, row.end_day, row.end_circa),
    lng: row.lng,
    lat: row.lat,
    body: {
      notes: parsed.notes ?? '',
      sources: parsed.sources ?? [],
      images: parsed.images ?? [],
      tags: parsed.tags ?? [],
      customFields: parsed.customFields ?? [],
      district: parsed.district,
      region: parsed.region,
    },
    touched: Boolean(row.touched),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
  }
}

export function featureToRow(feature: Feature): FeatureRow {
  return {
    id: feature.id,
    kind: feature.kind,
    slug: feature.slug,
    name_en: feature.nameEn,
    name_zh: feature.nameZh,
    status: feature.status,
    start_year: feature.start?.year ?? null,
    start_month: feature.start?.month ?? null,
    start_day: feature.start?.day ?? null,
    start_circa: feature.start?.circa ? 1 : 0,
    end_year: feature.end?.year ?? null,
    end_month: feature.end?.month ?? null,
    end_day: feature.end?.day ?? null,
    end_circa: feature.end?.circa ? 1 : 0,
    lng: feature.lng,
    lat: feature.lat,
    body: JSON.stringify(feature.body),
    touched: feature.touched ? 1 : 0,
    created_at: feature.createdAt,
    updated_at: feature.updatedAt,
    created_by: feature.createdBy ?? null,
    updated_by: feature.updatedBy ?? null,
  }
}
