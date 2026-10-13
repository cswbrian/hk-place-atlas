import { hk80ToWgs } from '../ui/lots/hk80'
import type { SiteLocale } from './locale'

export const LOCATION_SEARCH_URL = 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch'
export const ADDRESS_SEARCH_LIMIT = 5
export const PLACE_SEARCH_LIMIT = 5

export type AddressHit = {
  id: string
  name: string
  address: string
  district: string
  lng: number
  lat: number
}

type RawHit = {
  nameEN?: string
  nameZH?: string
  addressEN?: string
  addressZH?: string
  districtEN?: string
  districtZH?: string
  x?: number
  y?: number
}

export function locationSearchUrl(q: string): string {
  const params = new URLSearchParams({ q: q.trim() })
  return `${LOCATION_SEARCH_URL}?${params}`
}

function pick(en: string | undefined, zh: string | undefined, locale: SiteLocale): string {
  const primary = (locale === 'hk' ? zh : en)?.trim() ?? ''
  const fallback = (locale === 'hk' ? en : zh)?.trim() ?? ''
  return primary || fallback
}

export function parseLocationSearch(data: unknown, locale: SiteLocale, limit = ADDRESS_SEARCH_LIMIT): AddressHit[] {
  if (!Array.isArray(data)) return []
  const hits: AddressHit[] = []
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    const raw = row as RawHit
    if (typeof raw.x !== 'number' || typeof raw.y !== 'number' || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) {
      continue
    }
    const name = pick(raw.nameEN, raw.nameZH, locale)
    const address = pick(raw.addressEN, raw.addressZH, locale)
    const district = pick(raw.districtEN, raw.districtZH, locale)
    if (!name && !address) continue
    const [lng, lat] = hk80ToWgs(raw.x, raw.y)
    hits.push({
      id: `${raw.x},${raw.y},${name || address}`,
      name: name || address,
      address: name && address && address !== name ? address : '',
      district,
      lng,
      lat,
    })
    if (hits.length >= limit) break
  }
  return hits
}

export async function fetchAddressSearch(q: string, locale: SiteLocale): Promise<AddressHit[]> {
  const response = await fetch(locationSearchUrl(q))
  if (!response.ok) throw new Error('Could not search addresses')
  return parseLocationSearch(await response.json(), locale)
}
