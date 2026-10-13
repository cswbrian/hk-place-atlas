import { describe, expect, it } from 'vitest'
import {
  ADDRESS_SEARCH_LIMIT,
  LOCATION_SEARCH_URL,
  locationSearchUrl,
  parseLocationSearch,
} from './locationSearch'

const sample = [
  {
    addressZH: '梳士巴利道   10號',
    nameZH: '香港文化中心',
    districtZH: '油尖旺區',
    x: 835599.0,
    y: 817190.0,
    nameEN: 'HONG KONG CULTURAL CENTRE',
    addressEN: '10 SALISBURY ROAD  ',
    districtEN: 'Yau Tsim Mong District',
  },
  {
    nameEN: 'Missing coords',
    addressEN: 'Nowhere',
  },
]

describe('locationSearchUrl', () => {
  it('builds the LandsD locationSearch URL', () => {
    expect(locationSearchUrl('cultural centre')).toBe(
      `${LOCATION_SEARCH_URL}?q=cultural+centre`,
    )
  })
})

describe('parseLocationSearch', () => {
  it('maps HK80 to WGS84 and picks English labels', () => {
    const hits = parseLocationSearch(sample, 'en')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.name).toBe('HONG KONG CULTURAL CENTRE')
    expect(hits[0]!.address).toBe('10 SALISBURY ROAD')
    expect(hits[0]!.district).toBe('Yau Tsim Mong District')
    expect(hits[0]!.lng).toBeCloseTo(114.169, 2)
    expect(hits[0]!.lat).toBeCloseTo(22.294, 2)
  })

  it('picks Chinese labels for hk locale', () => {
    const hits = parseLocationSearch(sample, 'hk')
    expect(hits[0]!.name).toBe('香港文化中心')
    expect(hits[0]!.district).toBe('油尖旺區')
  })

  it('caps results', () => {
    const many = Array.from({ length: ADDRESS_SEARCH_LIMIT + 5 }, (_, i) => ({
      ...sample[0],
      x: 835599 + i,
      nameEN: `Place ${i}`,
    }))
    expect(parseLocationSearch(many, 'en')).toHaveLength(ADDRESS_SEARCH_LIMIT)
  })
})
