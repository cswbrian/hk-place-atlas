import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { commonsFileId, commonsPlaceId, mergeCommonsIngest, parseCommonsCategoryDraft } from './commons'
import type { AtlasRecord, Place, Relation } from './types'

const now = '2026-09-15T00:00:00.000Z'

function place(partial: Pick<Place, 'id' | 'geometry'> & Partial<Place>): Place {
  return {
    names: [{ lang: 'en', text: partial.id, primary: true }],
    status: 'unknown',
    built: null,
    demolished: null,
    notes: '',
    sources: [],
    images: [],
    tags: [],
    customFields: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

function record(partial: Pick<AtlasRecord, 'id'> & Partial<AtlasRecord>): AtlasRecord {
  return {
    title: partial.id,
    notes: '',
    urls: [],
    tags: [],
    links: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

describe('mergeCommonsIngest', () => {
  it('inserts the named generation, kept records, and a site successor to the current place', () => {
    const current = place({
      id: 'bdbiar-1533660',
      geometry: { type: 'Point', coordinates: [114.15732, 22.28201] },
      status: 'standing',
    })
    const generation = place({
      id: 'commons-jardine-house-1st-generation',
      names: [{ lang: 'en', text: 'Jardine House (1st generation)', primary: true }],
      status: 'demolished',
      built: { year: 1841, circa: true },
      demolished: { year: 1908 },
      geometry: { type: 'Point', coordinates: [114.1574, 22.2819] },
    })
    const photo = record({
      id: 'commons-file-old-premises-of-jardine-matheson',
      title: 'Old premises of Jardine Matheson',
      links: [{ kind: 'place', placeId: generation.id }],
    })
    const relation: Relation = {
      id: 'rel-commons-jardine-house-1st-generation-site',
      fromId: generation.id,
      toId: current.id,
      type: 'site_successor',
    }

    const merged = mergeCommonsIngest(
      { places: [current], records: [], relations: [] },
      { place: generation, records: [photo], relation },
    )

    expect(merged.places.map((item) => item.id).sort()).toEqual([
      'bdbiar-1533660',
      'commons-jardine-house-1st-generation',
    ])
    expect(merged.records).toEqual([photo])
    expect(merged.relations).toEqual([relation])
  })

  it('keeps claimed lots and buildings when the same commons place is ingested again', () => {
    const generation = place({
      id: 'commons-jardine-house-1st-generation',
      geometry: { type: 'Point', coordinates: [114.1574, 22.2819] },
    })
    const claimed = place({
      ...generation,
      lots: [{
        number: 'IL 1',
        geometry: {
          type: 'Polygon',
          coordinates: [[[114.157, 22.281], [114.158, 22.281], [114.158, 22.282], [114.157, 22.282], [114.157, 22.281]]],
        },
      }],
    })
    const incoming = place({
      ...generation,
      notes: 'Updated from Commons',
      geometry: { type: 'Point', coordinates: [114.16, 22.28] },
    })

    const merged = mergeCommonsIngest(
      { places: [claimed], records: [], relations: [] },
      { place: incoming, records: [] },
    )

    expect(merged.places).toHaveLength(1)
    expect(merged.places[0]?.notes).toBe('Updated from Commons')
    expect(merged.places[0]?.lots).toEqual(claimed.lots)
    expect(merged.places[0]?.geometry).toEqual(claimed.geometry)
  })
})

describe('commonsPlaceId', () => {
  it('turns a Commons category URL into a stable place id', () => {
    expect(
      commonsPlaceId('https://commons.wikimedia.org/wiki/Category:Jardine_House_(1st_generation)'),
    ).toBe('commons-jardine-house-1st-generation')
  })

  it('turns a File title into a stable record id', () => {
    expect(commonsFileId('File:Tcitp d219 old premises of jardine matheson and co.jpg')).toBe(
      'commons-file-tcitp-d219-old-premises-of-jardine-matheson-and-co-jpg',
    )
  })
})

describe('parseCommonsCategoryDraft', () => {
  it('reads category coords, extract, and file metadata from the Wikimedia API', () => {
    const draft = parseCommonsCategoryDraft({
      categoryUrl: 'https://commons.wikimedia.org/wiki/Category:Jardine_House_(1st_generation)',
      category: {
        query: {
          pages: [{
            title: 'Category:Jardine House (1st generation)',
            extract: 'The first Jardine House was probably built around 1841.',
            coordinates: [{ lat: 22.2819, lon: 114.1574 }],
          }],
        },
      },
      files: {
        query: {
          pages: [{
            title: 'File:Tcitp d219 old premises of jardine matheson and co.jpg',
            imageinfo: [{
              url: 'https://upload.wikimedia.org/wikipedia/commons/x.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Tcitp_d219_old_premises_of_jardine_matheson_and_co.jpg',
              extmetadata: {
                ImageDescription: { value: 'Old premises of Jardine Matheson' },
                Artist: { value: '<b>Unknown</b>' },
                LicenseShortName: { value: 'Public domain' },
                DateTimeOriginal: { value: '1870' },
              },
            }],
          }],
        },
      },
    })

    expect(draft).toMatchObject({
      title: 'Category:Jardine House (1st generation)',
      url: 'https://commons.wikimedia.org/wiki/Category:Jardine_House_(1st_generation)',
      extract: 'The first Jardine House was probably built around 1841.',
      lat: 22.2819,
      lng: 114.1574,
    })
    expect(draft.files).toEqual([{
      title: 'File:Tcitp d219 old premises of jardine matheson and co.jpg',
      pageUrl: 'https://commons.wikimedia.org/wiki/File:Tcitp_d219_old_premises_of_jardine_matheson_and_co.jpg',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/x.jpg',
      description: 'Old premises of Jardine Matheson',
      artist: 'Unknown',
      license: 'Public domain',
      date: '1870',
    }])
  })

  it('reads coords and English caption from category wikitext when extracts are empty', () => {
    const draft = parseCommonsCategoryDraft({
      categoryUrl: 'https://commons.wikimedia.org/wiki/Category:Jardine_House_(1st_generation)',
      category: {
        query: {
          pages: [{
            title: 'Category:Jardine House (1st generation)',
            extract: '',
            revisions: [{
              slots: {
                main: {
                  content: `{{object location|22.2819|114.1574}}
{{en|The first Jardine House was probably built around 1841. 20 Pedder Street is now occupied by the [[:Category:Wheelock House|Wheelock House]].}}`,
                },
              },
            }],
          }],
        },
      },
      files: { query: { pages: [] } },
    })

    expect(draft.lat).toBe(22.2819)
    expect(draft.lng).toBe(114.1574)
    expect(draft.extract).toBe(
      'The first Jardine House was probably built around 1841. 20 Pedder Street is now occupied by the Wheelock House.',
    )
  })
})

describe('approved Commons ingest files', () => {
  it('loads Jardine House (1st generation) with Chinese name, five records, and Wheelock successor', () => {
    const ingest = JSON.parse(
      readFileSync(new URL('../../data/commons/commons-jardine-house-1st-generation.json', import.meta.url), 'utf8'),
    )
    const merged = mergeCommonsIngest({ places: [], records: [], relations: [] }, ingest)
    const place = merged.places[0]
    expect(place?.id).toBe('commons-jardine-house-1st-generation')
    expect(place?.names).toEqual([
      { lang: 'en', text: 'Jardine House (1st generation)', primary: true },
      { lang: 'zh-Hant', text: '怡和洋行（畢打街第一代）' },
    ])
    expect(place?.status).toBe('demolished')
    expect(merged.records).toHaveLength(5)
    expect(merged.relations).toEqual([{
      id: 'rel-commons-jardine-house-1st-generation-site',
      fromId: 'commons-jardine-house-1st-generation',
      toId: 'bdbiar-1533660',
      type: 'site_successor',
    }])
  })
})
