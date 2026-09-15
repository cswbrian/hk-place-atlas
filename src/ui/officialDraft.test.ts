import { describe, expect, it } from 'vitest'
import type { BdbiarRecord } from '../domain/bdbiar'
import type { BuildingSnapshot, Place } from '../domain/types'
import { officialDraft, previousOnSiteDraft } from './officialDraft'

const building: BuildingSnapshot = {
  buildingId: '5154972',
  blockType: 'T',
  nameEn: 'Bonham Towers',
  nameZh: '般含閣',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [114.14, 22.283],
      [114.141, 22.283],
      [114.141, 22.284],
      [114.14, 22.284],
      [114.14, 22.283],
    ]],
  },
}

const record: BdbiarRecord = {
  buildingId: '5154972',
  addressEn: 'BONHAM TOWERS 88 BONHAM RD',
  addressZh: '般含閣 般咸道88號',
  opNumber: 'H57/70',
  occupiedAt: { year: 1970, month: 4, day: 28 },
  blockType: 'T',
  useEn: 'Residential/Composite',
  useZh: '住宅/綜合用途',
  lng: 114.140341,
  lat: 22.28380015,
}

describe('officialDraft', () => {
  it('prefills a standing place from the CSDI footprint and BDBIAR age record', () => {
    const draft = officialDraft(building, record)
    expect(draft.status).toBe('standing')
    expect(draft.names[0]).toMatchObject({ lang: 'en', text: 'Bonham Towers', primary: true })
    expect(draft.names[1]).toMatchObject({ lang: 'zh-Hant', text: '般含閣' })
    expect(draft.builtYear).toBe('1970')
    expect(draft.builtMonth).toBe('4')
    expect(draft.builtDay).toBe('28')
    expect(draft.locationLabel).toBe('BONHAM TOWERS 88 BONHAM RD')
    expect(draft.buildings).toEqual([building])
    expect(draft.tags).toBe('Residential/Composite')
    expect(draft.customFields).toContainEqual({ key: 'opNumber', value: 'H57/70' })
  })

  it('uses the BDBIAR address when CSDI has no name', () => {
    const unnamed = { ...building, nameEn: undefined, nameZh: undefined }
    const draft = officialDraft(unnamed, record)
    expect(draft.names[0]?.text).toBe('BONHAM TOWERS 88 BONHAM RD')
    expect(draft.names[1]?.text).toBe('般含閣 般咸道88號')
  })
})

describe('previousOnSiteDraft', () => {
  it('copies lots, not today’s building ids, and defaults demolished to current built', () => {
    const current: Place = {
      id: 'now',
      names: [{ lang: 'en', text: 'Bonham Towers', primary: true }],
      status: 'standing',
      built: { year: 1970, month: 4, day: 28 },
      demolished: null,
      geometry: building.geometry,
      lots: [{
        number: 'IL 1',
        geometry: building.geometry as Place['geometry'] & { type: 'Polygon' },
      }],
      buildings: [building],
      notes: '',
      sources: [],
      images: [],
      tags: [],
      customFields: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const draft = previousOnSiteDraft(current)
    expect(draft.id).toBeUndefined()
    expect(draft.buildings).toEqual([])
    expect(draft.lots).toEqual(current.lots)
    expect(draft.status).toBe('demolished')
    expect(draft.demolishedYear).toBe('1970')
    expect(draft.demolishedMonth).toBe('4')
    expect(draft.demolishedDay).toBe('28')
    expect(draft.names[0]?.text).toContain('Bonham Towers')
    expect(draft.point).toBeNull()
  })

  it('drops a centroid point when the current place has no lots', () => {
    const current: Place = {
      id: 'now',
      names: [{ lang: 'en', text: 'World Wide House', primary: true }],
      status: 'standing',
      built: { year: 1980 },
      demolished: null,
      geometry: { type: 'Point', coordinates: [114.1578, 22.283] },
      buildings: [building],
      notes: '',
      sources: [],
      images: [],
      tags: [],
      customFields: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const draft = previousOnSiteDraft(current)
    expect(draft.lots).toEqual([])
    expect(draft.buildings).toEqual([])
    expect(draft.point).toEqual([114.1578, 22.283])
  })
})
