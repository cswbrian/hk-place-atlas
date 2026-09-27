import type { BuildingSnapshot } from '../../domain/types'
import { parseBuildingFeatureCollection } from './parseBuildingGeoJson'

export async function fetchBuildingsInWgsBounds(
  west: number,
  south: number,
  east: number,
  north: number,
): Promise<BuildingSnapshot[]> {
  const params = new URLSearchParams({
    bbox: `${west},${south},${east},${north}`,
  })
  const response = await fetch(`/api/gis/buildings?${params}`)
  if (!response.ok) {
    throw new Error(`Building index failed (${response.status})`)
  }
  const data = (await response.json()) as { features?: unknown[] }
  return parseBuildingFeatureCollection(data as Parameters<typeof parseBuildingFeatureCollection>[0])
}
