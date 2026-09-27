import { describe, expect, it } from 'vitest'
import { emptyWikiDraft, wikiDraftFromFeature, wikiDraftToWrite } from './FeatureForm'
import type { Feature } from '../domain/feature'

describe('wikiDraftToWrite', () => {
  it('maps a shop draft onto a wiki write with the map point', () => {
    const write = wikiDraftToWrite({
      ...emptyWikiDraft(114.17, 22.3),
      kind: 'shop',
      nameEn: 'Cafe',
      nameZh: '咖啡',
      startYear: '1990',
      notes: 'hi',
    })
    expect(write).toMatchObject({
      kind: 'shop',
      nameEn: 'Cafe',
      nameZh: '咖啡',
      lng: 114.17,
      lat: 22.3,
      start: { year: 1990 },
      body: { notes: 'hi' },
    })
  })
})

describe('wikiDraftFromFeature', () => {
  it('round-trips occupancy fields for edit', () => {
    const feature: Feature = {
      id: 'wiki-1',
      kind: 'establishment',
      slug: 'house-1970',
      nameEn: 'House',
      nameZh: '屋',
      status: 'standing',
      start: { year: 1970 },
      end: null,
      lng: 114.1,
      lat: 22.2,
      body: { notes: 'n', sources: [], images: [], tags: [], customFields: [] },
      touched: true,
      createdAt: '',
      updatedAt: '',
    }
    expect(wikiDraftToWrite(wikiDraftFromFeature(feature))).toMatchObject({
      kind: 'establishment',
      nameEn: 'House',
      lng: 114.1,
      start: { year: 1970 },
    })
  })
})
