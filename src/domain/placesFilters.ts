import type { SiteLocale } from './locale'

export type PlaceChip = {
  slug: string
  en: string
  zh: string
  stored: string
}

export type PlaceRegion = PlaceChip & {
  districts: PlaceChip[]
}

export const PLACE_REGIONS: PlaceRegion[] = [
  {
    slug: 'hong-kong',
    en: 'Hong Kong Island',
    zh: '香港島',
    stored: 'Hong Kong',
    districts: [
      { slug: 'central-western', en: 'Central & Western', zh: '中西區', stored: 'Central & Western' },
      { slug: 'eastern', en: 'Eastern', zh: '東區', stored: 'Eastern' },
      { slug: 'southern', en: 'Southern', zh: '南區', stored: 'Southern' },
      { slug: 'wan-chai', en: 'Wan Chai', zh: '灣仔', stored: 'Wan Chai' },
    ],
  },
  {
    slug: 'kowloon',
    en: 'Kowloon',
    zh: '九龍',
    stored: 'Kowloon',
    districts: [
      { slug: 'kowloon-city', en: 'Kowloon City', zh: '九龍城', stored: 'Kowloon City' },
      { slug: 'kwun-tong', en: 'Kwun Tong', zh: '觀塘', stored: 'Kwun Tong' },
      { slug: 'sham-shui-po', en: 'Sham Shui Po', zh: '深水埗', stored: 'Sham Shui Po' },
      { slug: 'wong-tai-sin', en: 'Wong Tai Sin', zh: '黃大仙', stored: 'Wong Tai Sin' },
      { slug: 'yau-tsim-mong', en: 'Yau Tsim Mong', zh: '油尖旺', stored: 'Yau Tsim Mong' },
    ],
  },
  {
    slug: 'new-territories',
    en: 'New Territories',
    zh: '新界',
    stored: 'New Territories',
    districts: [
      { slug: 'islands', en: 'Islands', zh: '離島區', stored: 'Islands' },
      { slug: 'kwai-tsing', en: 'Kwai Tsing', zh: '葵青', stored: 'Kwai Tsing' },
      { slug: 'north', en: 'North', zh: '北區', stored: 'North' },
      { slug: 'sai-kung', en: 'Sai Kung', zh: '西貢', stored: 'Sai Kung' },
      { slug: 'sha-tin', en: 'Sha Tin', zh: '沙田', stored: 'Sha Tin' },
      { slug: 'tai-po', en: 'Tai Po', zh: '大埔', stored: 'Tai Po' },
      { slug: 'tsuen-wan', en: 'Tsuen Wan', zh: '荃灣', stored: 'Tsuen Wan' },
      { slug: 'tuen-mun', en: 'Tuen Mun', zh: '屯門', stored: 'Tuen Mun' },
      { slug: 'yuen-long', en: 'Yuen Long', zh: '元朗', stored: 'Yuen Long' },
    ],
  },
]

export const PLACE_DECADES = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020] as const

const GROUP_LABELS = {
  en: { region: 'Region', district: 'District', decade: 'Decade' },
  'zh-hk': { region: '區域', district: '區', decade: '年代' },
} as const

export type PlaceFilterGroup = keyof (typeof GROUP_LABELS)['en']

export function placeChipLabel(locale: SiteLocale, chip: { en: string; zh: string } | number): string {
  if (typeof chip === 'number') return locale === 'zh-hk' ? String(chip) : `${chip}s`
  return locale === 'zh-hk' ? chip.zh : chip.en
}

export function placeFilterGroupLabel(group: PlaceFilterGroup, locale: SiteLocale): string {
  return GROUP_LABELS[locale][group]
}

export function readPlacesFilters(params: URLSearchParams): {
  region: string | null
  district: string | null
  decade: number | null
} {
  const region = PLACE_REGIONS.find((item) => item.slug === params.get('region')) ?? null
  const district = region?.districts.find((item) => item.slug === params.get('district')) ?? null
  const decadeRaw = Number(params.get('decade'))
  const decade = (PLACE_DECADES as readonly number[]).includes(decadeRaw) ? decadeRaw : null
  return { region: region?.slug ?? null, district: district?.slug ?? null, decade }
}

export function placesFilterSql(filters: {
  region: string | null
  district: string | null
  decade: number | null
}): { sql: string; binds: (string | number)[] } {
  const parts: string[] = []
  const binds: (string | number)[] = []
  const region = PLACE_REGIONS.find((item) => item.slug === filters.region)
  if (region) {
    parts.push(`json_extract(body, '$.region') = ?`)
    binds.push(region.stored)
    const district = region.districts.find((item) => item.slug === filters.district)
    if (district) {
      parts.push(`json_extract(body, '$.district') = ?`)
      binds.push(district.stored)
    }
  }
  if (filters.decade != null && (PLACE_DECADES as readonly number[]).includes(filters.decade)) {
    parts.push('start_year >= ? AND start_year < ?')
    binds.push(filters.decade, filters.decade + 10)
  }
  return { sql: parts.join(' AND '), binds }
}
