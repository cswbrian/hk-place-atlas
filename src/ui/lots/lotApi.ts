import type { LotSnapshot, ParcelKind } from '../../domain/types'
import { clampLotBbox, hk80ToWgs, wgsToHk80 } from './hk80'
import { parseParcelIndexGml } from './parseLotGml'

const apiRoot = import.meta.env.DEV ? '/landsd-api' : 'https://mapapi.geodata.gov.hk'

const LIT: Record<ParcelKind, string> = {
  lot: 'lot',
  gla: 'gla',
  stt: 'stt',
}

const SEARCH_TYPE: Record<ParcelKind, string> = {
  lot: 'lot',
  gla: 'GLA',
  stt: 'STT',
}

function toSnapshot(lot: {
  number: string
  hk80Ring: [number, number][]
  kind?: ParcelKind
  metadata?: LotSnapshot['metadata']
}): LotSnapshot {
  const ring = lot.hk80Ring.map(([e, n]) => hk80ToWgs(e, n))
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push(ring[0])
  }
  return {
    number: lot.number,
    geometry: { type: 'Polygon', coordinates: [ring] },
    kind: lot.kind ?? 'lot',
    metadata: lot.metadata,
  }
}

function bboxFromWgs(west: number, south: number, east: number, north: number) {
  const [minX, minY] = wgsToHk80(west, south)
  const [maxX, maxY] = wgsToHk80(east, north)
  return clampLotBbox(
    Math.min(minX, maxX),
    Math.min(minY, maxY),
    Math.max(minX, maxX),
    Math.max(minY, maxY),
  )
}

async function fetchParcelsOfKind(
  kind: ParcelKind,
  west: number,
  south: number,
  east: number,
  north: number,
): Promise<LotSnapshot[]> {
  const bbox = bboxFromWgs(west, south, east, north)
  const url = `${apiRoot}/gs/api/v1.0.0/iC1000/${LIT[kind]}?bbox=${bbox.join(',')},EPSG:2326`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${kind.toUpperCase()} index failed (${response.status})`)
  }
  const xml = await response.text()
  return parseParcelIndexGml(xml, kind).map((lot) => toSnapshot(lot))
}

export async function fetchLotsInWgsBounds(
  west: number,
  south: number,
  east: number,
  north: number,
): Promise<LotSnapshot[]> {
  const results = await Promise.allSettled([
    fetchParcelsOfKind('lot', west, south, east, north),
    fetchParcelsOfKind('gla', west, south, east, north),
    fetchParcelsOfKind('stt', west, south, east, north),
  ])
  const parcels: LotSnapshot[] = []
  let firstError: Error | null = null
  for (const result of results) {
    if (result.status === 'fulfilled') parcels.push(...result.value)
    else if (!firstError) firstError = result.reason instanceof Error ? result.reason : new Error(String(result.reason))
  }
  if (parcels.length === 0 && firstError) throw firstError
  return parcels
}

export type LotSearchHit = {
  number: string
  kind: ParcelKind
  lng: number
  lat: number
  bbox: [number, number, number, number]
}

async function searchParcelNumber(kind: ParcelKind, text: string): Promise<LotSearchHit[]> {
  const url = `${apiRoot}/gs/api/v1.0.0/lus/${SEARCH_TYPE[kind]}/SearchNumber?text=${encodeURIComponent(text)}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${kind.toUpperCase()} search failed (${response.status})`)
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
        kind,
        lng,
        lat,
        bbox: [sw[0], sw[1], ne[0], ne[1]],
      },
    ]
  })
}

function guessParcelKind(text: string): ParcelKind[] {
  const upper = text.trim().toUpperCase()
  if (upper.startsWith('GLA')) return ['gla', 'lot', 'stt']
  if (upper.startsWith('STT')) return ['stt', 'lot', 'gla']
  return ['lot', 'gla', 'stt']
}

export async function searchLotNumber(text: string): Promise<LotSearchHit[]> {
  const order = guessParcelKind(text)
  for (const kind of order) {
    const hits = await searchParcelNumber(kind, text)
    if (hits.length) return hits
  }
  return []
}

export async function fetchLotByNumber(text: string): Promise<LotSnapshot | null> {
  const hits = await searchLotNumber(text)
  const hit = hits[0]
  if (!hit) return null
  const parcels = await fetchParcelsOfKind(hit.kind, hit.bbox[0], hit.bbox[1], hit.bbox[2], hit.bbox[3])
  return parcels.find((lot) => lot.number === hit.number) ?? parcels[0] ?? null
}
