import type { BuildingSnapshot } from '../../domain/types'
import { parseBuildingFeatureCollection } from './parseBuildingGeoJson'

const csdiRoot = import.meta.env.DEV
  ? '/csdi-api'
  : 'https://portal.csdi.gov.hk/server/services/common/landsd_rcd_1637211194312_35158/MapServer/WFSServer'

export async function fetchBuildingsInWgsBounds(
  west: number,
  south: number,
  east: number,
  north: number,
): Promise<BuildingSnapshot[]> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'Building',
    outputFormat: 'GEOJSON',
    srsName: 'EPSG:4326',
    // WFS 2.0 bbox with CRS is minLat,minLon,maxLat,maxLon for EPSG:4326 on this server
    bbox: `${south},${west},${north},${east},EPSG:4326`,
    count: '500',
  })
  const url = `${csdiRoot}?${params.toString()}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Building index failed (${response.status})`)
  }
  const data = (await response.json()) as { features?: unknown[] }
  return parseBuildingFeatureCollection(data as Parameters<typeof parseBuildingFeatureCollection>[0])
}
