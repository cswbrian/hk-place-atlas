import type { MultiPolygon, Polygon } from 'geojson'

export function borrowPolygonVertices(
  geometry: Polygon | MultiPolygon,
): [number, number][] {
  const ring =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.coordinates[0]?.[0]
  if (!ring?.length) return []
  const open =
    ring.length > 1
    && ring[0]![0] === ring[ring.length - 1]![0]
    && ring[0]![1] === ring[ring.length - 1]![1]
      ? ring.slice(0, -1)
      : ring
  return open.map((pos) => [pos[0], pos[1]] as [number, number])
}
