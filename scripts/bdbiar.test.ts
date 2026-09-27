import { describe, expect, it } from 'vitest'
import { featureFromBdbiar, featuresFromBdbiar, parseBdbiarCsv } from './bdbiar.ts'

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
})

describe('featureFromBdbiar', () => {
  it('converts a tower row into a standing establishment feature', () => {
    const record = parseBdbiarCsv(sample).get('5154972')!
    const feature = featureFromBdbiar(record)
    expect(feature).toMatchObject({
      id: 'bdbiar-5154972',
      kind: 'establishment',
      slug: 'bonham-towers-88-bonham-rd-1970',
      nameEn: 'BONHAM TOWERS 88 BONHAM RD',
      nameZh: '般含閣 般咸道88號',
      status: 'standing',
      start: { year: 1970, month: 4, day: 28 },
      end: null,
      lng: 114.140341,
      lat: 22.28380015,
      body: {
        notes: '',
        tags: ['Residential/Composite'],
        district: 'Central & Western',
        region: 'Hong Kong',
      },
    })
    expect(feature.body.customFields).toEqual(
      expect.arrayContaining([
        { key: 'bdbiarId', value: '5154972' },
        { key: 'opNumber', value: 'H57/70' },
      ]),
    )
  })

  it('groups podium and tower on the same OP and address', () => {
    const features = featuresFromBdbiar(parseBdbiarCsv(sample))
    const house = features.find((feature) => feature.id === 'bdbiar-25167')
    expect(house).toBeDefined()
    expect(features.some((feature) => feature.id === 'bdbiar-25101')).toBe(false)
    expect(house?.body.customFields.filter((field) => field.key === 'bdbiarId').map((field) => field.value).sort()).toEqual([
      '25101',
      '25167',
    ])
  })
})
