import type { FeatureKind } from './feature'

export type SiteLocale = 'en' | 'zh-hk'

export type LocalePath = {
  locale: SiteLocale
  rest: string
}

export type FeaturePath = {
  group: 'place' | 'event'
  slug: string
}

export type PlacesPath = { slug: string | null }

export type PlacesBrowse = {
  page?: number
  letter?: string | null
  q?: string | null
  region?: string | null
  district?: string | null
  decade?: number | null
}

export const copy = {
  en: {
    title: 'HK Atlas',
    tagline: 'Hong Kong buildings, shops, and events over time',
    thisSite: 'This site',
    thisSiteZh: '此地',
    close: 'Close',
    emptySite: 'Nothing recorded here yet.',
    language: 'English',
    otherLanguage: '繁',
    hint: 'Click a pin or the map for site history',
    signIn: 'Sign in',
    signOut: 'Sign out',
    add: 'Add',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    kind: 'Kind',
    nameEn: 'English name',
    nameZh: 'Chinese name',
    notes: 'Notes',
    establishment: 'Building',
    shop: 'Shop',
    event: 'Event',
    clickMap: 'Click the map to set a point',
    search: 'Search',
    searchPlaceholder: 'Search places',
    noResults: 'No matches',
    history: 'History',
    revert: 'Revert',
    map: 'Map',
    places: 'Places',
    viewOnMap: 'View on map',
    pickPlace: 'Pick a place',
  },
  'zh-hk': {
    title: '香港地圖集',
    tagline: '香港樓宇、店舖與事件的時間地圖',
    thisSite: '此地',
    thisSiteZh: 'This site',
    close: '關閉',
    emptySite: '此地尚未有紀錄。',
    language: '繁',
    otherLanguage: 'English',
    hint: '點地圖或圖標查看此地紀錄',
    signIn: '登入',
    signOut: '登出',
    add: '新增',
    edit: '編輯',
    save: '儲存',
    cancel: '取消',
    delete: '刪除',
    kind: '類型',
    nameEn: '英文名稱',
    nameZh: '中文名稱',
    notes: '備註',
    establishment: '樓宇',
    shop: '店舖',
    event: '事件',
    clickMap: '點地圖設定位置',
    search: '搜尋',
    searchPlaceholder: '搜尋地點',
    noResults: '沒有符合的紀錄',
    history: '歷史',
    revert: '還原',
    map: '地圖',
    places: '地點',
    viewOnMap: '在地圖查看',
    pickPlace: '選擇地點',
  },
} as const

const LOCALES = new Set<SiteLocale>(['en', 'zh-hk'])

function normalizeRest(rest: string): string {
  if (!rest || rest === '/') return '/'
  return rest.startsWith('/') ? rest : `/${rest}`
}

export function parseLocalePath(pathname: string): LocalePath {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  const first = parts[0]
  if (first && LOCALES.has(first as SiteLocale)) {
    const rest = parts.slice(1).join('/')
    return { locale: first as SiteLocale, rest: rest ? `/${rest}` : '/' }
  }
  return { locale: 'en', rest: normalizeRest(pathname) }
}

export function switchLocalePath(pathname: string, locale: SiteLocale): string {
  const { rest } = parseLocalePath(pathname)
  return rest === '/' ? `/${locale}` : `/${locale}${rest}`
}

export function parseFeaturePath(rest: string): FeaturePath | null {
  const match = /^\/(place|event)\/([^/]+)$/.exec(rest)
  if (!match) return null
  return { group: match[1] as FeaturePath['group'], slug: decodeURIComponent(match[2]!) }
}

export function parsePlacesPath(rest: string): PlacesPath | null {
  if (rest === '/places') return { slug: null }
  const match = /^\/places\/([^/]+)$/.exec(rest)
  if (!match) return null
  return { slug: decodeURIComponent(match[1]!) }
}

export function placesPublicPath(
  locale: SiteLocale,
  slug?: string | null,
  browse: PlacesBrowse = {},
): string {
  const base = slug ? `/${locale}/places/${encodeURIComponent(slug)}` : `/${locale}/places`
  const params = new URLSearchParams()
  const q = browse.q?.trim()
  if (q) params.set('q', q)
  if (!q && browse.letter) params.set('letter', browse.letter)
  if (browse.region) params.set('region', browse.region)
  if (browse.district) params.set('district', browse.district)
  if (browse.decade) params.set('decade', String(browse.decade))
  if (browse.page && browse.page > 1) params.set('page', String(browse.page))
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

export function featurePublicPath(locale: SiteLocale, kind: FeatureKind, slug: string): string {
  const group = kind === 'event' ? 'event' : 'place'
  return `/${locale}/${group}/${slug}`
}

export function displayNames(
  names: { nameEn: string; nameZh: string },
  locale: SiteLocale,
): { title: string; secondary: string | null } {
  const en = names.nameEn.trim()
  const zh = names.nameZh.trim()
  if (locale === 'zh-hk') {
    const title = zh || en
    return { title, secondary: en && en !== title ? en : null }
  }
  const title = en || zh
  return { title, secondary: zh && zh !== title ? zh : null }
}
