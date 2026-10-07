import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { emptyWikiDraft, FeatureForm, wikiDraftFromFeature, wikiDraftToWrite } from './FeatureForm'
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

  it('keeps circa on both dates when the year is only approximate', () => {
    const write = wikiDraftToWrite({
      ...emptyWikiDraft(114.17, 22.3),
      nameEn: 'Centre',
      startYear: '1982',
      startCirca: true,
      endYear: '2001',
      endCirca: true,
    })
    expect(write.start).toEqual({ year: 1982, circa: true })
    expect(write.end).toEqual({ year: 2001, circa: true })
  })
})

describe('FeatureForm labels', () => {
  it('uses Traditional Chinese for status and dates on the hk site', () => {
    const html = renderToStaticMarkup(
      createElement(FeatureForm, {
        locale: 'hk',
        draft: emptyWikiDraft(null, null),
        creating: false,
        error: null,
        onChange: () => {},
        onSave: () => {},
        onCancel: () => {},
      }),
    )
    expect(html).toContain('狀態')
    expect(html).toContain('現存')
    expect(html).toContain('已拆卸')
    expect(html).toContain('不詳')
    expect(html).toContain('落成')
    expect(html).toMatch(/拆卸\s*<input/)
    expect(html).toContain('placeholder="年份"')
  })

  it('names the date fields Built and Demolished in English', () => {
    const html = renderToStaticMarkup(
      createElement(FeatureForm, {
        locale: 'en',
        draft: emptyWikiDraft(null, null),
        creating: false,
        error: null,
        onChange: () => {},
        onSave: () => {},
        onCancel: () => {},
      }),
    )
    expect(html).toContain('Built')
    expect(html).toMatch(/Demolished\s*<input/)
    expect(html.match(/circa/g)).toHaveLength(2)
  })

  it('lets an uncertain start or end year be marked circa', () => {
    const html = renderToStaticMarkup(
      createElement(FeatureForm, {
        locale: 'hk',
        draft: { ...emptyWikiDraft(null, null), startYear: '1982', startCirca: true, endYear: '1990' },
        creating: false,
        error: null,
        onChange: () => {},
        onSave: () => {},
        onCancel: () => {},
      }),
    )
    const checks = [...html.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)].map((match) => match[0])
    expect(html.match(/大約/g)).toHaveLength(2)
    expect(checks).toHaveLength(2)
    expect(checks[0]).toContain('checked')
    expect(checks[1]).not.toContain('checked')
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
