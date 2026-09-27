import type { SiteLocale } from './locale'
import { readPlacesFilters } from './placesFilters'

export const PLACES_PAGE_SIZE = 50
export const PLACES_PAGE_SIZE_MAX = 100
export const OCCUPANCY_SQL = `kind IN ('establishment','shop')`

export type PlacesListQuery = {
  page: number
  pageSize: number
  letter: string | null
  q: string | null
  region: string | null
  district: string | null
  decade: number | null
  locale: SiteLocale
}

export type PlacesListItem = {
  slug: string
  kind: 'establishment' | 'shop'
  nameEn: string
  nameZh: string
  status: string
  startYear: number | null
  endYear: number | null
}

export type PlacesListResponse = {
  page: number
  pageSize: number
  total: number
  features: PlacesListItem[]
}

export function nameEnLetter(nameEn: string): string {
  const ch = nameEn.trim().charAt(0).toUpperCase()
  if (ch >= 'A' && ch <= 'Z') return ch
  return '#'
}

export function parsePlacesListQuery(params: URLSearchParams, locale: SiteLocale): PlacesListQuery {
  const page = Math.max(1, Math.trunc(Number(params.get('page')) || 1))
  const rawSize = Math.trunc(Number(params.get('pageSize')) || PLACES_PAGE_SIZE)
  const pageSize = Math.min(PLACES_PAGE_SIZE_MAX, Math.max(1, rawSize))
  const q = params.get('q')?.trim() || null
  const rawLetter = (params.get('letter') ?? '').toUpperCase()
  const letter = q ? null : rawLetter === '#' || /^[A-Z]$/.test(rawLetter) ? rawLetter : null
  const filters = readPlacesFilters(params)
  return { page, pageSize, letter, q, ...filters, locale: locale === 'zh-hk' ? 'zh-hk' : 'en' }
}

export function clampPage(page: number, total: number, pageSize: number): number {
  if (total <= 0) return 1
  const last = Math.ceil(total / pageSize)
  if (page < 1) return 1
  if (page > last) return last
  return page
}

export function placesOrderSql(locale: SiteLocale): string {
  return locale === 'zh-hk'
    ? 'name_zh COLLATE NOCASE, name_en COLLATE NOCASE, slug'
    : 'name_en COLLATE NOCASE, name_zh COLLATE NOCASE, slug'
}

export function letterSql(letter: string | null): { sql: string; binds: string[] } | null {
  if (!letter) return null
  if (letter === '#') {
    return {
      sql: `UPPER(SUBSTR(TRIM(name_en), 1, 1)) NOT BETWEEN 'A' AND 'Z'`,
      binds: [],
    }
  }
  return {
    sql: `UPPER(SUBSTR(TRIM(name_en), 1, 1)) = ?`,
    binds: [letter],
  }
}

export function placesListItemFromRow(row: {
  slug: string
  kind: string
  name_en: string
  name_zh: string
  status: string
  start_year: number | null
  end_year: number | null
}): PlacesListItem {
  return {
    slug: row.slug,
    kind: row.kind === 'shop' ? 'shop' : 'establishment',
    nameEn: row.name_en,
    nameZh: row.name_zh,
    status: row.status,
    startYear: row.start_year,
    endYear: row.end_year,
  }
}
