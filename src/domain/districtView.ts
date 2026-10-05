import type { Bbox } from './featureQuery'

const DISTRICT_BBOX: Record<string, Bbox> = {
  'central-western': { west: 114.125, south: 22.255, east: 114.168, north: 22.29 },
  eastern: { west: 114.19, south: 22.255, east: 114.253, north: 22.294 },
  southern: { west: 114.118, south: 22.195, east: 114.255, north: 22.255 },
  'wan-chai': { west: 114.166, south: 22.26, east: 114.203, north: 22.288 },
  'kowloon-city': { west: 114.173, south: 22.305, east: 114.215, north: 22.345 },
  'kwun-tong': { west: 114.204, south: 22.295, east: 114.242, north: 22.335 },
  'sham-shui-po': { west: 114.137, south: 22.325, east: 114.177, north: 22.347 },
  'wong-tai-sin': { west: 114.185, south: 22.335, east: 114.22, north: 22.354 },
  'yau-tsim-mong': { west: 114.154, south: 22.295, east: 114.185, north: 22.326 },
  islands: { west: 113.85, south: 22.19, east: 114.13, north: 22.33 },
  'kwai-tsing': { west: 114.084, south: 22.325, east: 114.145, north: 22.376 },
  north: { west: 114.1, south: 22.49, east: 114.23, north: 22.55 },
  'sai-kung': { west: 114.22, south: 22.3, east: 114.38, north: 22.48 },
  'sha-tin': { west: 114.16, south: 22.36, east: 114.25, north: 22.43 },
  'tai-po': { west: 114.14, south: 22.43, east: 114.28, north: 22.52 },
  'tsuen-wan': { west: 114.05, south: 22.35, east: 114.14, north: 22.4 },
  'tuen-mun': { west: 113.89, south: 22.36, east: 114.02, north: 22.43 },
  'yuen-long': { west: 113.97, south: 22.42, east: 114.13, north: 22.5 },
}

export function districtBbox(slug: string): Bbox | null {
  return DISTRICT_BBOX[slug] ?? null
}
