import type { Point } from 'geojson'
import type { BuildingSnapshot, LotSnapshot, Place, PlaceGeometry } from './types'
import { compareSiteOrder, geometryContainsPoint, siteCluster } from './site'

const NEARBY_METERS = 25

export type QueryableRecord = {
  id: string
  geometry?: Point
  links: Array<
    | { kind: 'place'; placeId: string }
    | { kind: 'building'; buildingId: string }
    | { kind: 'lot'; lotNumber: string }
    | { kind: 'point' }
  >
}

export type SiteQueryInput = {
  lng: number
  lat: number
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
  places: Place[]
  records: QueryableRecord[]
}

export type SiteQueryResult = {
  lng: number
  lat: number
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
  placeIds: string[]
  recordIds: string[]
}

export function querySite(input: SiteQueryInput): SiteQueryResult {
  const point: [number, number] = [input.lng, input.lat]
  const buildings = input.buildings.filter((building) =>
    geometryContainsPoint(building.geometry, point),
  )
  const lots = input.lots.filter((lot) => geometryContainsPoint(lot.geometry, point))
  const lotNumbers = new Set(lots.map((lot) => lot.number))
  const hitPlacePolygons = input.places.filter(
    (place) =>
      place.geometry != null
      && place.geometry.type !== 'Point'
      && geometryContainsPoint(place.geometry, point),
  )
  const polygonHit = buildings.length > 0 || lots.length > 0 || hitPlacePolygons.length > 0
  const hitGeometries = [
    ...buildings.map((building) => building.geometry),
    ...lots.map((lot) => lot.geometry),
    ...hitPlacePolygons.flatMap((place) => (place.geometry ? [place.geometry] : [])),
  ]

  const directPlaceIds = new Set<string>()
  for (const place of input.places) {
    if (place.geometry && place.geometry.type !== 'Point' && geometryContainsPoint(place.geometry, point)) {
      directPlaceIds.add(place.id)
      continue
    }
    if ((place.lots ?? []).some((lot) => lotNumbers.has(lot.number))) {
      directPlaceIds.add(place.id)
      continue
    }
    if (!place.geometry || place.geometry.type !== 'Point') continue
    const coords = place.geometry.coordinates as [number, number]
    if (polygonHit) {
      if (hitGeometries.some((geometry) => geometryContainsPoint(geometry, coords))) {
        directPlaceIds.add(place.id)
      }
      continue
    }
    const bdbiarPin =
      place.customFields.some((field) => field.key === 'bdbiarId')
      && (place.lots ?? []).length === 0
      && (place.buildings ?? []).length === 0
    const limit = bdbiarPin ? 8 : NEARBY_METERS
    if (haversineMeters(coords, point) <= limit) directPlaceIds.add(place.id)
  }

  for (const building of buildings) {
    for (const place of input.places) {
      if ((place.buildings ?? []).some((item) => item.buildingId === building.buildingId)) {
        directPlaceIds.add(place.id)
      }
    }
  }

  const clustered = new Set<string>()
  for (const id of directPlaceIds) {
    for (const member of siteCluster(input.places, id, { nearbyPoints: !polygonHit })) {
      clustered.add(member)
    }
  }

  const placeIds = [...clustered]
    .map((id) => input.places.find((place) => place.id === id))
    .filter((place): place is Place => Boolean(place))
    .sort(compareSiteOrder)
    .map((place) => place.id)

  const placeIdSet = new Set(placeIds)
  const buildingIds = new Set(buildings.map((building) => building.buildingId))
  const recordIds = input.records
    .filter((record) => {
      if (record.geometry?.type === 'Point') {
        const coords: [number, number] = [
          record.geometry.coordinates[0],
          record.geometry.coordinates[1],
        ]
        if (polygonHit) {
          if (hitGeometries.some((geometry) => geometryContainsPoint(geometry, coords))) return true
        } else if (haversineMeters(coords, point) <= NEARBY_METERS) {
          return true
        }
      }
      return record.links.some((link) => {
        if (link.kind === 'place') return placeIdSet.has(link.placeId)
        if (link.kind === 'building') return buildingIds.has(link.buildingId)
        if (link.kind === 'lot') return lotNumbers.has(link.lotNumber)
        return false
      })
    })
    .map((record) => record.id)

  return {
    lng: input.lng,
    lat: input.lat,
    buildings,
    lots,
    placeIds,
    recordIds,
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

export function placeInBounds(
  geometry: PlaceGeometry | null,
  bounds: { west: number; south: number; east: number; north: number },
): boolean {
  if (!geometry) return false
  const [lng, lat] = geometryCentroid(geometry)
  return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north
}

function geometryCentroid(geometry: PlaceGeometry): [number, number] {
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
