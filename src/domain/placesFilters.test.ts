import { describe, expect, it } from 'vitest'
import {
  PLACE_DECADES,
  PLACE_REGIONS,
  placeChipLabel,
  placeFilterGroupLabel,
  placesFilterSql,
} from './placesFilters'

describe('PLACE_REGIONS', () => {
  it('lists regions and their districts in chip order', () => {
    expect(
      PLACE_REGIONS.map((region) => ({
        slug: region.slug,
        en: region.en,
        zh: region.zh,
        stored: region.stored,
        districts: region.districts.map((district) => [district.slug, district.en, district.zh, district.stored]),
      })),
    ).toEqual([
      {
        slug: 'hong-kong',
        en: 'Hong Kong Island',
        zh: '香港島',
        stored: 'Hong Kong',
        districts: [
          ['central-western', 'Central & Western', '中西區', 'Central & Western'],
          ['eastern', 'Eastern', '東區', 'Eastern'],
          ['southern', 'Southern', '南區', 'Southern'],
          ['wan-chai', 'Wan Chai', '灣仔', 'Wan Chai'],
        ],
      },
      {
        slug: 'kowloon',
        en: 'Kowloon',
        zh: '九龍',
        stored: 'Kowloon',
        districts: [
          ['kowloon-city', 'Kowloon City', '九龍城', 'Kowloon City'],
          ['kwun-tong', 'Kwun Tong', '觀塘', 'Kwun Tong'],
          ['sham-shui-po', 'Sham Shui Po', '深水埗', 'Sham Shui Po'],
          ['wong-tai-sin', 'Wong Tai Sin', '黃大仙', 'Wong Tai Sin'],
          ['yau-tsim-mong', 'Yau Tsim Mong', '油尖旺', 'Yau Tsim Mong'],
        ],
      },
      {
        slug: 'new-territories',
        en: 'New Territories',
        zh: '新界',
        stored: 'New Territories',
        districts: [
          ['islands', 'Islands', '離島區', 'Islands'],
          ['kwai-tsing', 'Kwai Tsing', '葵青', 'Kwai Tsing'],
          ['north', 'North', '北區', 'North'],
          ['sai-kung', 'Sai Kung', '西貢', 'Sai Kung'],
          ['sha-tin', 'Sha Tin', '沙田', 'Sha Tin'],
          ['tai-po', 'Tai Po', '大埔', 'Tai Po'],
          ['tsuen-wan', 'Tsuen Wan', '荃灣', 'Tsuen Wan'],
          ['tuen-mun', 'Tuen Mun', '屯門', 'Tuen Mun'],
          ['yuen-long', 'Yuen Long', '元朗', 'Yuen Long'],
        ],
      },
    ])
  })
})

describe('PLACE_DECADES', () => {
  it('runs from the 1940s through the 2020s', () => {
    expect(PLACE_DECADES).toEqual([1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020])
  })
})

describe('placeChipLabel', () => {
  it('uses the locale label and a decade suffix', () => {
    expect(placeChipLabel('en', { en: 'Kowloon', zh: '九龍' })).toBe('Kowloon')
    expect(placeChipLabel('zh-hk', { en: 'Kowloon', zh: '九龍' })).toBe('九龍')
    expect(placeChipLabel('en', 1980)).toBe('1980s')
    expect(placeChipLabel('zh-hk', 1980)).toBe('1980')
  })
})

describe('placeFilterGroupLabel', () => {
  it('names the three chip rows', () => {
    expect(placeFilterGroupLabel('region', 'en')).toBe('Region')
    expect(placeFilterGroupLabel('district', 'en')).toBe('District')
    expect(placeFilterGroupLabel('decade', 'en')).toBe('Decade')
    expect(placeFilterGroupLabel('region', 'zh-hk')).toBe('區域')
    expect(placeFilterGroupLabel('district', 'zh-hk')).toBe('區')
    expect(placeFilterGroupLabel('decade', 'zh-hk')).toBe('年代')
  })
})

describe('placesFilterSql', () => {
  it('returns no clause when every filter is empty', () => {
    expect(placesFilterSql({ region: null, district: null, decade: null })).toEqual({ sql: '', binds: [] })
  })

  it('binds the stored English region and district, plus the decade range', () => {
    expect(
      placesFilterSql({ region: 'hong-kong', district: 'central-western', decade: 1980 }),
    ).toEqual({
      sql: "json_extract(body, '$.region') = ? AND json_extract(body, '$.district') = ? AND start_year >= ? AND start_year < ?",
      binds: ['Hong Kong', 'Central & Western', 1980, 1990],
    })
  })

  it('drops a district that is outside the region', () => {
    expect(placesFilterSql({ region: 'kowloon', district: 'southern', decade: null })).toEqual({
      sql: "json_extract(body, '$.region') = ?",
      binds: ['Kowloon'],
    })
  })

  it('ignores an unknown region, district, or decade', () => {
    expect(placesFilterSql({ region: 'macau', district: 'southern', decade: 1930 })).toEqual({
      sql: '',
      binds: [],
    })
  })
})
