import type { FeatureKind } from './feature'
import type { SiteLocale } from './locale'

export const RECENT_LIMIT = 5

export function shouldLoadRecent(input: {
  onMap: boolean
  selected: boolean
  siteOpen: boolean
  featurePath: boolean
}): boolean {
  return input.onMap && !input.selected && !input.siteOpen && !input.featurePath
}

export function recentListSql(): string {
  return `SELECT slug, kind, name_en, name_zh, start_year, end_year, updated_at
     FROM features
     WHERE lng IS NOT NULL AND lat IS NOT NULL AND updated_at != ''
     ORDER BY updated_at DESC
     LIMIT ?`
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const KINDS = new Set<FeatureKind>(['establishment', 'shop', 'event', 'agent'])

export type RecentItem = {
  slug: string
  kind: FeatureKind
  nameEn: string
  nameZh: string
  startYear: number | null
  endYear: number | null
  updatedAt: string
}

export function yearSpan(item: Pick<RecentItem, 'startYear' | 'endYear'>): string {
  if (item.startYear == null && item.endYear == null) return '—'
  if (item.startYear == null) return `–${item.endYear}`
  if (item.endYear == null) return `${item.startYear}–`
  return `${item.startYear}–${item.endYear}`
}

function calendar(then: number, locale: SiteLocale): string {
  const date = new Date(then)
  const day = date.getUTCDate()
  const month = date.getUTCMonth()
  const year = date.getUTCFullYear()
  if (locale === 'zh-hk') return `${year}年${month + 1}月${day}日更新`
  return `updated ${day} ${MONTHS[month]} ${year}`
}

function countLabel(count: number, one: string, many: string, locale: SiteLocale): string {
  if (locale === 'zh-hk') return `${count} ${many}`
  return count === 1 ? `updated 1 ${one} ago` : `updated ${count} ${many} ago`
}

export function updatedAgo(updatedAt: string, now: Date, locale: SiteLocale): string {
  const then = Date.parse(updatedAt)
  if (!updatedAt || Number.isNaN(then)) return ''
  const delta = Math.max(0, now.getTime() - then)
  if (delta < MINUTE) return locale === 'zh-hk' ? '剛剛更新' : 'updated just now'
  if (delta < HOUR) return countLabel(Math.floor(delta / MINUTE), 'minute', locale === 'zh-hk' ? '分鐘前更新' : 'minutes', locale)
  if (delta < DAY) return countLabel(Math.floor(delta / HOUR), 'hour', locale === 'zh-hk' ? '小時前更新' : 'hours', locale)
  if (delta < MONTH) return countLabel(Math.floor(delta / DAY), 'day', locale === 'zh-hk' ? '日前更新' : 'days', locale)
  return calendar(then, locale)
}

export function recentItemFromRow(row: {
  slug: string
  kind: string
  name_en: string
  name_zh: string
  start_year: number | null
  end_year: number | null
  updated_at: string
}): RecentItem {
  return {
    slug: row.slug,
    kind: KINDS.has(row.kind as FeatureKind) ? (row.kind as FeatureKind) : 'establishment',
    nameEn: row.name_en,
    nameZh: row.name_zh,
    startYear: row.start_year,
    endYear: row.end_year,
    updatedAt: row.updated_at,
  }
}
