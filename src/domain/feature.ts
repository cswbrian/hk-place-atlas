import type { CustomField, Establishment, FuzzyDate, Source } from './types'

export type FeatureKind = 'establishment' | 'shop' | 'event' | 'agent'

export type FeatureStatus = 'standing' | 'demolished' | 'unknown'

export type FeatureBody = {
  notes: string
  sources: Source[]
  images: Source[]
  tags: string[]
  customFields: CustomField[]
  district?: string
  region?: string
}

export type Feature = {
  id: string
  kind: FeatureKind
  slug: string
  nameEn: string
  nameZh: string
  status: FeatureStatus
  start: FuzzyDate | null
  end: FuzzyDate | null
  lng: number | null
  lat: number | null
  body: FeatureBody
  touched: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export const OCCUPANCY_KINDS: FeatureKind[] = ['establishment', 'shop']

export function slugify(nameEn: string, year?: number | null): string {
  const base = nameEn
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const stem = base || 'place'
  return year ? `${stem}-${year}` : stem
}

export function uniqueSlug(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  const next = `${base}-${n}`
  used.add(next)
  return next
}

export function featureAsEstablishment(feature: Feature): Establishment {
  return {
    id: feature.id,
    names: [
      { lang: 'en', text: feature.nameEn, primary: true },
      { lang: 'zh-Hant', text: feature.nameZh },
    ],
    status: feature.status,
    built: feature.start,
    demolished: feature.end,
    geometry:
      feature.lng != null && feature.lat != null
        ? { type: 'Point', coordinates: [feature.lng, feature.lat] }
        : null,
    notes: feature.body.notes,
    sources: feature.body.sources,
    images: feature.body.images,
    tags: feature.body.tags,
    customFields: feature.body.customFields,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
    createdBy: feature.createdBy,
    updatedBy: feature.updatedBy,
  }
}
