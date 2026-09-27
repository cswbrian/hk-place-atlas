import type { BuildingSnapshot, LotSnapshot, Establishment, EstablishmentGeometry } from './types'
import { compareSiteOrder, geometryContainsPoint, siteCluster } from './site'

const NEARBY_METERS = 25

export type SiteQueryInput = {
  lng: number
  lat: number
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
  establishments: Establishment[]
}

export type SiteQueryResult = {
  lng: number
  lat: number
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
  establishmentIds: string[]
}

export function querySite(input: SiteQueryInput): SiteQueryResult {
  const point: [number, number] = [input.lng, input.lat]
  const buildings = input.buildings.filter((building) =>
    geometryContainsPoint(building.geometry, point),
  )
  const lots = input.lots.filter((lot) => geometryContainsPoint(lot.geometry, point))
  const lotNumbers = new Set(lots.map((lot) => lot.number))
  const hitEstablishmentPolygons = input.establishments.filter(
    (establishment) =>
      establishment.geometry != null
      && establishment.geometry.type !== 'Point'
      && geometryContainsPoint(establishment.geometry, point),
  )
  const polygonHit = buildings.length > 0 || lots.length > 0 || hitEstablishmentPolygons.length > 0
  const hitGeometries = [
    ...buildings.map((building) => building.geometry),
    ...lots.map((lot) => lot.geometry),
    ...hitEstablishmentPolygons.flatMap((establishment) => (establishment.geometry ? [establishment.geometry] : [])),
  ]

  const directEstablishmentIds = new Set<string>()
  for (const establishment of input.establishments) {
    if (establishment.geometry && establishment.geometry.type !== 'Point' && geometryContainsPoint(establishment.geometry, point)) {
      directEstablishmentIds.add(establishment.id)
      continue
    }
    if ((establishment.lots ?? []).some((lot) => lotNumbers.has(lot.number))) {
      directEstablishmentIds.add(establishment.id)
      continue
    }
    if (!establishment.geometry || establishment.geometry.type !== 'Point') continue
    const coords = establishment.geometry.coordinates as [number, number]
    if (polygonHit) {
      if (hitGeometries.some((geometry) => geometryContainsPoint(geometry, coords))) {
        directEstablishmentIds.add(establishment.id)
      }
      continue
    }
    const bdbiarPin =
      establishment.customFields.some((field) => field.key === 'bdbiarId')
      && (establishment.lots ?? []).length === 0
      && (establishment.buildings ?? []).length === 0
    const limit = bdbiarPin ? 8 : NEARBY_METERS
    if (haversineMeters(coords, point) <= limit) directEstablishmentIds.add(establishment.id)
  }

  for (const building of buildings) {
    for (const establishment of input.establishments) {
      if ((establishment.buildings ?? []).some((item) => item.buildingId === building.buildingId)) {
        directEstablishmentIds.add(establishment.id)
      }
    }
  }

  const clustered = new Set<string>()
  for (const id of directEstablishmentIds) {
    for (const member of siteCluster(input.establishments, id, { nearbyPoints: !polygonHit })) {
      clustered.add(member)
    }
  }

  const establishmentIds = [...clustered]
    .map((id) => input.establishments.find((establishment) => establishment.id === id))
    .filter((establishment): establishment is Establishment => Boolean(establishment))
    .sort(compareSiteOrder)
    .map((establishment) => establishment.id)

  return {
    lng: input.lng,
    lat: input.lat,
    buildings,
    lots,
    establishmentIds,
  }
}

function haversineMeters(a: [number, number], b: [number, number]): number {
  const earth = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.sqrt(h))
}

export function establishmentInBounds(
  geometry: EstablishmentGeometry | null,
  bounds: { west: number; south: number; east: number; north: number },
): boolean {
  if (!geometry) return false
  const [lng, lat] = geometryCentroid(geometry)
  return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north
}

function geometryCentroid(geometry: EstablishmentGeometry): [number, number] {
  if (geometry.type === 'Point') return [geometry.coordinates[0], geometry.coordinates[1]]
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0] ?? []
    if (!ring.length) return [0, 0]
    const sum = ring.reduce<[number, number]>((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0])
    return [sum[0] / ring.length, sum[1] / ring.length]
  }
  const ring = geometry.coordinates[0]?.[0] ?? []
  if (!ring.length) return [0, 0]
  const sum = ring.reduce<[number, number]>((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0])
  return [sum[0] / ring.length, sum[1] / ring.length]
}
