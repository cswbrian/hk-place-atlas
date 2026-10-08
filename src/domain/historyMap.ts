export type HistoryMapId = 'central-1938' | 'victoria-1889' | 'victoria-1897'

export type HistoryMapDef = {
  id: HistoryMapId
  datasetId: string
  year: number
}

export type MercatorBbox = {
  west: number
  south: number
  east: number
  north: number
}

export const DEFAULT_HISTORY_MAP_ID: HistoryMapId = 'central-1938'
export const DEFAULT_HISTORY_OPACITY = 0.7
export const HISTORY_MAP_MIN_Z = 9
export const HISTORY_MAP_MAX_Z = 19

export const HISTORY_MAPS: readonly HistoryMapDef[] = [
  { id: 'central-1938', datasetId: 'landsd_rcd_1671592552706_20818', year: 1938 },
  { id: 'victoria-1889', datasetId: 'landsd_rcd_1631586233937_28500', year: 1889 },
  { id: 'victoria-1897', datasetId: 'landsd_rcd_1637714431413_44900', year: 1897 },
]

const BY_ID = Object.fromEntries(HISTORY_MAPS.map((m) => [m.id, m])) as Record<
  HistoryMapId,
  HistoryMapDef
>

export function isHistoryMapId(value: string): value is HistoryMapId {
  return value in BY_ID
}

export function historyMapDatasetId(id: HistoryMapId): string {
  return BY_ID[id].datasetId
}

export function historyMapTileTemplate(id: HistoryMapId): string {
  return `/api/history-map/${id}/{z}/{x}/{y}.png`
}

const EARTH_RADIUS = 6378137
const ORIGIN_SHIFT = Math.PI * EARTH_RADIUS

export function xyzToMercatorBbox(z: number, x: number, y: number): MercatorBbox {
  const n = 2 ** z
  const tileSize = (2 * ORIGIN_SHIFT) / n
  const west = -ORIGIN_SHIFT + x * tileSize
  const east = west + tileSize
  const north = ORIGIN_SHIFT - y * tileSize
  const south = north - tileSize
  return { west, south, east, north }
}

export function historyMapExportUrl(datasetId: string, bbox: MercatorBbox): string {
  const params = new URLSearchParams({
    bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
    bboxSR: '3857',
    imageSR: '3857',
    size: '256,256',
    format: 'png32',
    transparent: 'true',
    f: 'image',
  })
  return `https://portal.csdi.gov.hk/server/rest/services/common/${datasetId}/MapServer/export?${params}`
}
