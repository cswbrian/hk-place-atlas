import type { FeatureCollection, Point } from 'geojson'
import { featureStandingInYear, type Feature, type FeatureKind, type FeatureStatus } from './feature'

export type CatalogProperties = {
  id: string
  slug: string
  kind: FeatureKind
  status: string
  startYear: number | null
  endYear: number | null
  nameEn: string
  nameZh: string
}

export type CatalogGeojson = FeatureCollection<Point, CatalogProperties>

function yearDate(year: number | null) {
  return year == null ? null : { year }
}

export function catalogStandingInYear(properties: CatalogProperties, year: number, now: number): boolean {
  return featureStandingInYear(
    {
      kind: properties.kind,
      start: yearDate(properties.startYear),
      end: yearDate(properties.endYear),
    },
    year,
    now,
  )
}

export function filterCatalogCollection(
  collection: CatalogGeojson,
  year: number,
  now: number,
): CatalogGeojson {
  return {
    type: 'FeatureCollection',
    features: collection.features.filter((feature) => catalogStandingInYear(feature.properties, year, now)),
  }
}

export function catalogFeatureToFeature(feature: CatalogGeojson['features'][number]): Feature {
  const [lng, lat] = feature.geometry.coordinates
  const properties = feature.properties
  return {
    id: properties.id,
    kind: properties.kind,
    slug: properties.slug,
    nameEn: properties.nameEn,
    nameZh: properties.nameZh,
    status: (properties.status as FeatureStatus) || 'unknown',
    start: properties.startYear == null ? null : { year: properties.startYear },
    end: properties.endYear == null ? null : { year: properties.endYear },
    lng,
    lat,
    body: { notes: '', sources: [], images: [], tags: [], customFields: [] },
    touched: false,
    createdAt: '',
    updatedAt: '',
  }
}

export function featureToCatalogFeature(feature: Feature): CatalogGeojson['features'][number] | null {
  if (feature.lng == null || feature.lat == null) return null
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [feature.lng, feature.lat] },
    properties: {
      id: feature.id,
      slug: feature.slug,
      kind: feature.kind,
      status: feature.status,
      startYear: feature.start?.year ?? null,
      endYear: feature.end?.year ?? null,
      nameEn: feature.nameEn,
      nameZh: feature.nameZh,
    },
  }
}

export function mergeOverlay(collection: CatalogGeojson, overlay: Feature[]): CatalogGeojson {
  const extra = new Map<string, CatalogGeojson['features'][number]>()
  for (const feature of overlay) {
    const pin = featureToCatalogFeature(feature)
    if (pin) extra.set(feature.id, pin)
  }
  const features = collection.features.map((feature) => extra.get(feature.properties.id) ?? feature)
  const seen = new Set(features.map((feature) => feature.properties.id))
  for (const [id, pin] of extra) {
    if (!seen.has(id)) features.push(pin)
  }
  return { type: 'FeatureCollection', features }
}
