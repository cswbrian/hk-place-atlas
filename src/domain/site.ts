import type { Place, PlaceGeometry } from './types'

const NEARBY_METERS = 25

export type SiteClusterOptions = {
  /** When false, skip 25 m point-to-point grouping (polygon hits). Default true. */
  nearbyPoints?: boolean
}

export function siteCluster(
  places: Place[],
  placeId: string,
  options?: SiteClusterOptions,
): string[] {
  const nearbyPoints = options?.nearbyPoints !== false
  const byId = new Map(places.map((place) => [place.id, place]))
  const start = byId.get(placeId)
  if (!start) return [placeId]
  const seen = new Set<string>([placeId])
  const queue = [start]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    for (const other of places) {
      if (seen.has(other.id)) continue
      if (!sameSite(current, other, nearbyPoints)) continue
      seen.add(other.id)
      queue.push(other)
    }
  }
  return [...seen]
    .map((id) => byId.get(id))
    .filter((place): place is Place => Boolean(place))
    .sort(compareSiteOrder)
    .map((place) => place.id)
}

export function compareSiteOrder(a: Place, b: Place): number {
  const built = (b.built?.year ?? 9999) - (a.built?.year ?? 9999)
  if (built !== 0) return built
  const demolished = (b.demolished?.year ?? 9999) - (a.demolished?.year ?? 9999)
  if (demolished !== 0) return demolished
  return a.id.localeCompare(b.id)
}

function sameSite(a: Place, b: Place, nearbyPoints: boolean): boolean {
  if (sharedLot(a, b)) return true
  if (!a.geometry || !b.geometry) return false
  if (geometryContainsPoint(b.geometry, geometryCentroid(a.geometry))) return true
  if (geometryContainsPoint(a.geometry, geometryCentroid(b.geometry))) return true
  if (!nearbyPoints) return false
  if (a.geometry.type === 'Point' && b.geometry.type === 'Point') {
    // Dense BDBIAR pins are often <25 m apart; never cluster them by proximity.
    if (isBdbiarPin(a) || isBdbiarPin(b)) return false
    return haversineMeters(geometryCentroid(a.geometry), geometryCentroid(b.geometry)) <= NEARBY_METERS
  }
  return false
}

function isBdbiarPin(place: Place): boolean {
  if (!place.customFields.some((field) => field.key === 'bdbiarId')) return false
  if ((place.lots ?? []).length > 0) return false
  if ((place.buildings ?? []).length > 0) return false
  return place.geometry?.type === 'Point'
}

function sharedLot(a: Place, b: Place): boolean {
  const left = new Set((a.lots ?? []).map((lot) => lot.number))
  if (left.size === 0) return false
  return (b.lots ?? []).some((lot) => left.has(lot.number))
}

function geometryCentroid(geometry: PlaceGeometry): [number, number] {
  const ring = firstRing(geometry)
  if (ring.length === 0) return [0, 0]
  const sum = ring.reduce<[number, number]>(
    (acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]],
    [0, 0],
  )
  return [sum[0] / ring.length, sum[1] / ring.length]
}

function firstRing(geometry: PlaceGeometry): number[][] {
  if (geometry.type === 'Point') return [geometry.coordinates]
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? []
  return geometry.coordinates[0]?.[0] ?? []
}

export function geometryContainsPoint(geometry: PlaceGeometry, point: [number, number]): boolean {
  if (geometry.type === 'Point') return false
  const rings =
    geometry.type === 'Polygon'
      ? [geometry.coordinates[0] ?? []]
      : geometry.coordinates.map((polygon) => polygon[0] ?? [])
  return rings.some((ring) => pointInRing(point, ring))
}

function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0]
    const yi = ring[i]?.[1]
    const xj = ring[j]?.[0]
    const yj = ring[j]?.[1]
    if (xi == null || yi == null || xj == null || yj == null) continue
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
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
