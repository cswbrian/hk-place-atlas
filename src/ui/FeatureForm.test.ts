import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  emptyWikiDraft,
  FeatureForm,
  wikiDraftFromFeature,
  wikiDraftIssues,
  wikiDraftToWrite,
  withEndYear,
} from './FeatureForm'
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

describe('withEndYear', () => {
  it('sets status to demolished as soon as a demolition year is entered', () => {
    const draft = { ...emptyWikiDraft(null, null), status: 'standing' as const }
    expect(withEndYear(draft, '1979').status).toBe('demolished')
    expect(withEndYear(draft, '1979').endYear).toBe('1979')
  })

  it('does not change status when the demolition year is cleared', () => {
    const draft = {
      ...emptyWikiDraft(null, null),
      status: 'demolished' as const,
      endYear: '1979',
    }
    expect(withEndYear(draft, '').status).toBe('demolished')
    expect(withEndYear(draft, '').endYear).toBe('')
  })
})

describe('wikiDraftIssues', () => {
  it('accepts empty years and demolished without an end year', () => {
    expect(wikiDraftIssues(emptyWikiDraft(null, null))).toEqual([])
    expect(
      wikiDraftIssues({
        ...emptyWikiDraft(null, null),
        status: 'demolished',
        startYear: '1980',
      }),
    ).toEqual([])
  })

  it('requires years in 1700–2100 when filled', () => {
    expect(wikiDraftIssues({ ...emptyWikiDraft(null, null), startYear: '1699' })).toEqual(['year'])
    expect(wikiDraftIssues({ ...emptyWikiDraft(null, null), startYear: '1700' })).toEqual([])
    expect(wikiDraftIssues({ ...emptyWikiDraft(null, null), endYear: '2101', status: 'demolished' })).toEqual([
      'year',
    ])
    expect(wikiDraftIssues({ ...emptyWikiDraft(null, null), startYear: 'abc' })).toEqual(['year'])
  })

  it('rejects a demolished year before the built year', () => {
    expect(
      wikiDraftIssues({
        ...emptyWikiDraft(null, null),
        status: 'demolished',
        startYear: '1980',
        endYear: '1979',
      }),
    ).toEqual(['yearOrder'])
  })

  it('rejects a standing place that still has a demolition year', () => {
    expect(
      wikiDraftIssues({
        ...emptyWikiDraft(null, null),
        status: 'standing',
        endYear: '1979',
      }),
    ).toEqual(['standingEnd'])
  })
})

describe('FeatureForm labels', () => {
  it('only enables building kind and marks the rest as coming soon', () => {
    const html = renderToStaticMarkup(
      createElement(FeatureForm, {
        locale: 'hk',
        draft: emptyWikiDraft(null, null),
        creating: true,
        error: null,
        onChange: () => {},
        onSave: () => {},
        onCancel: () => {},
      }),
    )
    expect(html).toContain('建築物')
    expect(html).toContain('店舖（稍後推出）')
    expect(html).toContain('事件（稍後推出）')
    expect(html).toMatch(/value="shop"[^>]*disabled/)
    expect(html).toMatch(/value="event"[^>]*disabled/)
    expect(html).not.toMatch(/value="establishment"[^>]*disabled/)
  })

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
    expect(html).not.toContain('不詳')
    expect(html).toContain('type="radio"')
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
