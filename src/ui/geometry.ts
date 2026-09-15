import type { Position } from 'geojson'
import type { Place, PlaceGeometry } from '../domain/types'

export function geometryCentroid(geometry: PlaceGeometry): [number, number] {
  const ring = firstRing(geometry)
  const sum = ring.reduce<[number, number]>(
    (acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]],
    [0, 0],
  )
  return [sum[0] / ring.length, sum[1] / ring.length]
}

function firstRing(geometry: PlaceGeometry): Position[] {
  if (geometry.type === 'Point') return [geometry.coordinates]
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? []
  return geometry.coordinates[0]?.[0] ?? []
}

export function placeLngLat(place: Place): [number, number] | null {
  if (!place.geometry) return null
  return geometryCentroid(place.geometry)
}
