import type { Bbox } from './featureQuery'

export const CSDI_WFS =
  'https://portal.csdi.gov.hk/server/services/common/landsd_rcd_1637211194312_35158/MapServer/WFSServer'

export const LANDSD_ROOT = 'https://mapapi.geodata.gov.hk'

export const GIS_MAX_SPAN = 0.02
export const GIS_POINT_PAD = 0.002
export const GIS_CACHE_SECONDS = 3600

const HK: Bbox = { west: 113.75, south: 22.12, east: 114.52, north: 22.58 }

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

export const PARCEL_KINDS = ['lot', 'gla', 'stt'] as const
export type ParcelKind = (typeof PARCEL_KINDS)[number]

const PARCEL_LIT: Record<ParcelKind, string> = {
  lot: 'lot',
  gla: 'gla',
  stt: 'stt',
}

const PARCEL_SEARCH: Record<ParcelKind, string> = {
  lot: 'lot',
  gla: 'GLA',
  stt: 'STT',
}

export function clampGisBbox(bbox: Bbox): Bbox | null {
  const west = Math.max(bbox.west, HK.west)
  const south = Math.max(bbox.south, HK.south)
  const east = Math.min(bbox.east, HK.east)
  const north = Math.min(bbox.north, HK.north)
  if (!(west < east) || !(south < north)) return null
  const cx = (west + east) / 2
  const cy = (south + north) / 2
  const halfLng = Math.min((east - west) / 2, GIS_MAX_SPAN / 2)
  const halfLat = Math.min((north - south) / 2, GIS_MAX_SPAN / 2)
  return {
    west: round6(cx - halfLng),
    south: round6(cy - halfLat),
    east: round6(cx + halfLng),
    north: round6(cy + halfLat),
  }
}

export function gisAroundPoint(lng: number, lat: number, pad = GIS_POINT_PAD): Bbox | null {
  return clampGisBbox({
    west: lng - pad,
    south: lat - pad,
    east: lng + pad,
    north: lat + pad,
  })
}

export function csdiBuildingsUrl(bbox: Bbox): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'Building',
    outputFormat: 'GEOJSON',
    srsName: 'EPSG:4326',
    bbox: `${bbox.south},${bbox.west},${bbox.north},${bbox.east},EPSG:4326`,
    count: '500',
  })
  return `${CSDI_WFS}?${params}`
}

export function parseParcelKind(value: string | null): ParcelKind | null {
  const kind = value?.trim().toLowerCase()
  return PARCEL_KINDS.find((item) => item === kind) ?? null
}

export function landsdParcelUrl(kind: ParcelKind, hk80Bbox: [number, number, number, number]): string {
  return `${LANDSD_ROOT}/gs/api/v1.0.0/iC1000/${PARCEL_LIT[kind]}?bbox=${hk80Bbox.join(',')},EPSG:2326`
}

export function landsdSearchUrl(kind: ParcelKind, text: string): string {
  return `${LANDSD_ROOT}/gs/api/v1.0.0/lus/${PARCEL_SEARCH[kind]}/SearchNumber?text=${encodeURIComponent(text)}`
}

export function parseSearchText(value: string | null): string | null {
  const text = value?.trim() ?? ''
  if (text.length < 1 || text.length > 80) return null
  if (/[\n\r]/.test(text)) return null
  return text
}
