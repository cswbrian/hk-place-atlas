import type { LotSnapshot } from '../../domain/types'
import { clampLotBbox, hk80ToWgs, wgsToHk80 } from './hk80'
import { parseLotIndexGml } from './parseLotGml'

const apiRoot = import.meta.env.DEV ? '/landsd-api' : 'https://mapapi.geodata.gov.hk'

function toSnapshot(number: string, hk80Ring: [number, number][]): LotSnapshot {
  const ring = hk80Ring.map(([e, n]) => hk80ToWgs(e, n))
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push(ring[0])
  }
  return {
    number,
    geometry: { type: 'Polygon', coordinates: [ring] },
  }
}

export async function fetchLotsInWgsBounds(
  west: number,
  south: number,
  east: number,
  north: number,
): Promise<LotSnapshot[]> {
  const [minX, minY] = wgsToHk80(west, south)
  const [maxX, maxY] = wgsToHk80(east, north)
  const bbox = clampLotBbox(
    Math.min(minX, maxX),
    Math.min(minY, maxY),
    Math.max(minX, maxX),
    Math.max(minY, maxY),
  )
  const url = `${apiRoot}/gs/api/v1.0.0/iC1000/lot?bbox=${bbox.join(',')},EPSG:2326`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Lot index failed (${response.status})`)
  }
  const xml = await response.text()
  return parseLotIndexGml(xml).map((lot) => toSnapshot(lot.number, lot.hk80Ring))
}

export type LotSearchHit = {
  number: string
  lng: number
  lat: number
  bbox: [number, number, number, number]
}

export async function searchLotNumber(text: string): Promise<LotSearchHit[]> {
  const url = `${apiRoot}/gs/api/v1.0.0/lus/lot/SearchNumber?text=${encodeURIComponent(text)}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Lot search failed (${response.status})`)
  }
  const data = (await response.json()) as {
    candidates?: Array<{
      attributes?: { Descr?: string; Xmin?: number; Xmax?: number; Ymin?: number; Ymax?: number }
      location?: { x: number; y: number }
    }>
  }
  return (data.candidates ?? []).flatMap((candidate) => {
    const number = candidate.attributes?.Descr
    const x = candidate.location?.x
    const y = candidate.location?.y
    if (!number || x == null || y == null) return []
    const [lng, lat] = hk80ToWgs(x, y)
    const xmin = candidate.attributes?.Xmin ?? x - 40
    const ymin = candidate.attributes?.Ymin ?? y - 40
    const xmax = candidate.attributes?.Xmax ?? x + 40
    const ymax = candidate.attributes?.Ymax ?? y + 40
    const sw = hk80ToWgs(xmin, ymin)
    const ne = hk80ToWgs(xmax, ymax)
    return [
      {
        number,
        lng,
        lat,
        bbox: [sw[0], sw[1], ne[0], ne[1]],
      },
    ]
  })
}

export async function fetchLotByNumber(text: string): Promise<LotSnapshot | null> {
  const hits = await searchLotNumber(text)
  const hit = hits[0]
  if (!hit) return null
  const lots = await fetchLotsInWgsBounds(hit.bbox[0], hit.bbox[1], hit.bbox[2], hit.bbox[3])
  return lots.find((lot) => lot.number === hit.number) ?? lots[0] ?? null
}
