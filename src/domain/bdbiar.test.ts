import { describe, expect, it } from 'vitest'
import {
  parseBdbiarCsv,
  matchBdbiar,
  placeFromBdbiar,
  placesFromBdbiar,
  mergeBdbiarPlaces,
  findBdbiarPlaceForBuilding,
  claimBuildingOntoPlace,
  retargetPlaceId,
  BDBIAR_SEED_AT,
  type BdbiarRecord,
} from './bdbiar'
import type { AtlasRecord, Place, Relation } from './types'

const sample = `OBJECTID,DATASET_E,DATASET_C,ADDRESS_E,ADDRESS_C,SEARCH1_E,SEARCH1_C,SEARCH2_E,SEARCH2_C,NSEARCH1_E,NSEARCH1_C,NSEARCH2_E,NSEARCH2_C,NSEARCH3_E,NSEARCH3_C,NSEARCH4_E,NSEARCH4_C,NSEARCH5_E,NSEARCH5_C,LATITUDE,LONGITUDE,GeometryLongitude,GeometryLatitude
49,Building information and age records,樓宇資料及樓齡紀錄,BONHAM TOWERS 88 BONHAM RD,般含閣 般咸道88號,Central & Western,中西區,Hong Kong,香港島,5154972,5154972,H57/70,H57/70,1970-04-28,1970-04-28,Tower,座,Residential/Composite,住宅/綜合用途,22.28380015,114.140341,114.14034100013714,22.283800150056948
36730,Building information and age records,樓宇資料及樓齡紀錄,"90 BONHAM RD THE UNIVERSITY OF HONG KONG MAIN BLDG, FUNG PING SHAN BLDG",般咸道90號,Central & Western,中西區,Hong Kong,香港島,5049724,5049724,H162/60,H162/60,1960-08-22,1960-08-22,Tower,座,Others,其他,22.28460169,114.1379484,114.13794839969898,22.284601689716283
482,Building information and age records,樓宇資料及樓齡紀錄,5 BABINGTON PATH BABINGTON HOUSE,巴丙頓道5號 巴威大廈,Central & Western,中西區,Hong Kong,香港島,25101,25101,H18/72,H18/72,1972-01-26,1972-01-26,Podium,平台,Residential/Composite,住宅/綜合用途,22.28342052,114.1412811,114.14128110014269,22.283420520140965
483,Building information and age records,樓宇資料及樓齡紀錄,5 BABINGTON PATH BABINGTON HOUSE,巴丙頓道5號 巴威大廈,Central & Western,中西區,Hong Kong,香港島,25167,25167,H18/72,H18/72,1972-01-26,1972-01-26,Tower,座,Residential/Composite,住宅/綜合用途,22.2834164,114.1412689,114.14126889993986,22.283416400346653
`

describe('parseBdbiarCsv', () => {
  it('indexes a row by building id with occupation date and addresses', () => {
    const records = parseBdbiarCsv(sample)
    expect(records.get('5154972')).toMatchObject({
      buildingId: '5154972',
      addressEn: 'BONHAM TOWERS 88 BONHAM RD',
      addressZh: '般含閣 般咸道88號',
      opNumber: 'H57/70',
      occupiedAt: { year: 1970, month: 4, day: 28 },
      blockType: 'T',
      useEn: 'Residential/Composite',
      lng: 114.140341,
      lat: 22.28380015,
    })
  })

  it('keeps commas inside quoted addresses', () => {
    const records = parseBdbiarCsv(sample)
    expect(records.get('5049724')?.addressEn).toBe(
      '90 BONHAM RD THE UNIVERSITY OF HONG KONG MAIN BLDG, FUNG PING SHAN BLDG',
    )
  })

  it('matches a CSDI footprint by contained point when building ids differ', () => {
    const records = parseBdbiarCsv(sample)
    const building = {
      buildingId: 'csdi-not-bdbiar',
      blockType: 'T' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [114.14, 22.283],
          [114.141, 22.283],
          [114.141, 22.284],
          [114.14, 22.284],
          [114.14, 22.283],
        ]],
      },
    }
    expect(matchBdbiar(building, records)?.buildingId).toBe('5154972')
  })
})

describe('placeFromBdbiar', () => {
  it('converts a tower row into a standing Place with stable id and provenance', () => {
    const record = parseBdbiarCsv(sample).get('5154972')!
    const place = placeFromBdbiar(record)
    expect(place).toMatchObject({
      id: 'bdbiar-5154972',
      status: 'standing',
      built: { year: 1970, month: 4, day: 28 },
      demolished: null,
      locationLabel: 'BONHAM TOWERS 88 BONHAM RD',
      tags: ['Residential/Composite'],
      geometry: { type: 'Point', coordinates: [114.140341, 22.28380015] },
      createdAt: BDBIAR_SEED_AT,
      updatedAt: BDBIAR_SEED_AT,
    })
    expect(place.names).toEqual([
      { lang: 'en', text: 'BONHAM TOWERS 88 BONHAM RD', primary: true },
      { lang: 'zh-Hant', text: '般含閣 般咸道88號' },
    ])
    expect(place.customFields).toEqual(
      expect.arrayContaining([
        { key: 'bdbiarId', value: '5154972' },
        { key: 'opNumber', value: 'H57/70' },
        { key: 'useZh', value: '住宅/綜合用途' },
      ]),
    )
    expect(place.customFields.some((field) => field.key === 'blockType')).toBe(false)
    expect(place.sources).toEqual([
      { label: 'Building information and age records', url: 'https://data.gov.hk' },
    ])
  })

  it('merges podium and tower rows that share an occupation permit and address', () => {
    const places = placesFromBdbiar(parseBdbiarCsv(sample))
    expect(places.find((place) => place.id === 'bdbiar-25101')).toBeUndefined()
    const merged = places.find((place) => place.id === 'bdbiar-25167')
    expect(merged?.names[0]?.text).toBe('5 BABINGTON PATH BABINGTON HOUSE')
    expect(merged?.customFields.filter((field) => field.key === 'bdbiarId').map((field) => field.value)).toEqual([
      '25167',
      '25101',
    ])
    expect(merged?.customFields.find((field) => field.key === 'opNumber')?.value).toBe('H18/72')
    expect(merged?.customFields.some((field) => field.key === 'blockType')).toBe(false)
  })

  it('keeps rows with the same address but different occupation permits as separate Places', () => {
    const places = placesFromBdbiar(
      new Map<string, BdbiarRecord>([
        ['1', record({ buildingId: '1', addressEn: '8 CONNAUGHT PLACE', opNumber: 'H1/85', blockType: 'T' })],
        ['2', record({ buildingId: '2', addressEn: '8 CONNAUGHT PLACE', opNumber: 'H20/88', blockType: 'T' })],
      ]),
    )
    expect(places.map((place) => place.id).sort()).toEqual(['bdbiar-1', 'bdbiar-2'])
  })
})

function record(partial: Partial<BdbiarRecord> & Pick<BdbiarRecord, 'buildingId'>): BdbiarRecord {
  return {
    addressEn: 'ADDRESS',
    addressZh: '',
    opNumber: 'H1/70',
    occupiedAt: { year: 1970, month: 1, day: 1 },
    blockType: 'T',
    useEn: 'Office/Commercial',
    useZh: '',
    lng: 114.15,
    lat: 22.28,
    ...partial,
  }
}

describe('mergeBdbiarPlaces', () => {
  it('inserts missing BDBIAR places and keeps user-edited ones', () => {
    const seeded = placesFromBdbiar(parseBdbiarCsv(sample))
    const edited = {
      ...seeded[0]!,
      notes: 'User note',
      updatedAt: '2026-09-14T00:00:00.000Z',
    }
    const existing = [edited]
    const merged = mergeBdbiarPlaces(existing, seeded)
    expect(merged.places.find((place) => place.id === edited.id)?.notes).toBe('User note')
    expect(merged.places).toHaveLength(seeded.length)
    expect(merged.removedIds).toEqual([])
  })

  it('does not overwrite an untouched BDBIAR place that already exists', () => {
    const seeded = placesFromBdbiar(parseBdbiarCsv(sample))
    const existing = [seeded[0]!]
    const merged = mergeBdbiarPlaces(existing, seeded)
    expect(merged.places.filter((place) => place.id === seeded[0]!.id)).toHaveLength(1)
    expect(merged.places.find((place) => place.id === seeded[0]!.id)).toBe(seeded[0])
  })

  it('collapses an existing podium Place into the tower Place for the same OP', () => {
    const seeded = placesFromBdbiar(parseBdbiarCsv(sample))
    const podium: Place = {
      ...placeFromBdbiar(parseBdbiarCsv(sample).get('25101')!),
      notes: 'Podium note',
      buildings: [
        {
          buildingId: 'csdi-podium',
          blockType: 'P',
          geometry: {
            type: 'Polygon',
            coordinates: [[[114.141, 22.283], [114.142, 22.283], [114.142, 22.284], [114.141, 22.284], [114.141, 22.283]]],
          },
        },
      ],
    }
    const merged = mergeBdbiarPlaces([podium], seeded)
    expect(merged.removedIds).toEqual(['bdbiar-25101'])
    const kept = merged.places.find((place) => place.id === 'bdbiar-25167')
    expect(kept?.notes).toBe('Podium note')
    expect(kept?.buildings).toEqual(podium.buildings)
    expect(kept?.customFields.filter((field) => field.key === 'bdbiarId').map((field) => field.value)).toEqual([
      '25167',
      '25101',
    ])
  })
})

describe('retargetPlaceId', () => {
  it('rewrites relations and record links from the old place id', () => {
    const relations: Relation[] = [
      { id: 'r1', fromId: 'bdbiar-25101', toId: 'other', type: 'site_successor' },
    ]
    const records: AtlasRecord[] = [
      {
        id: 'rec1',
        title: 'Note',
        notes: '',
        urls: [],
        tags: [],
        links: [{ kind: 'place', placeId: 'bdbiar-25101' }],
        createdAt: BDBIAR_SEED_AT,
        updatedAt: BDBIAR_SEED_AT,
      },
    ]
    const next = retargetPlaceId('bdbiar-25101', 'bdbiar-25167', { relations, records })
    expect(next.relations[0]?.fromId).toBe('bdbiar-25167')
    expect(next.records[0]?.links).toEqual([{ kind: 'place', placeId: 'bdbiar-25167' }])
  })
})

describe('findBdbiarPlaceForBuilding', () => {
  it('matches a BDBIAR place whose point lies in the footprint and block type matches', () => {
    const places = placesFromBdbiar(parseBdbiarCsv(sample))
    const building = {
      buildingId: 'csdi-5154972',
      blockType: 'T' as const,
      nameEn: 'Bonham Towers',
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [114.14, 22.283],
          [114.141, 22.283],
          [114.141, 22.284],
          [114.14, 22.284],
          [114.14, 22.283],
        ]],
      },
    }
    const found = findBdbiarPlaceForBuilding(places, building)
    expect(found?.id).toBe('bdbiar-5154972')
  })

  it('finds the merged Place by either BDBIAR building id', () => {
    const places = placesFromBdbiar(parseBdbiarCsv(sample))
    const podium = {
      buildingId: '25101',
      blockType: 'P' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
    }
    const tower = { ...podium, buildingId: '25167', blockType: 'T' as const }
    expect(findBdbiarPlaceForBuilding(places, podium)?.id).toBe('bdbiar-25167')
    expect(findBdbiarPlaceForBuilding(places, tower)?.id).toBe('bdbiar-25167')
  })

  it('claims the building onto the place and updates geometry', () => {
    const place = placesFromBdbiar(parseBdbiarCsv(sample)).find((item) => item.id === 'bdbiar-5154972')!
    const building = {
      buildingId: 'csdi-5154972',
      blockType: 'T' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [114.14, 22.283],
          [114.141, 22.283],
          [114.141, 22.284],
          [114.14, 22.284],
          [114.14, 22.283],
        ]],
      },
    }
    const claimed = claimBuildingOntoPlace(place, building)
    expect(claimed.buildings).toEqual([building])
    expect(claimed.geometry).toEqual(building.geometry)
  })
})
