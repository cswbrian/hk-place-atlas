import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Establishment, LotSnapshot } from '../domain/types'
import { EstablishmentDetail } from './EstablishmentDetail'

const now = '2026-01-01T00:00:00.000Z'

function lot(number: string): LotSnapshot {
  return {
    number,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [114.15, 22.28],
        [114.151, 22.28],
        [114.151, 22.281],
        [114.15, 22.281],
        [114.15, 22.28],
      ]],
    },
  }
}

function place(partial: Pick<Establishment, 'id' | 'names' | 'status'> & Partial<Establishment>): Establishment {
  return {
    built: null,
    demolished: null,
    geometry: null,
    notes: '',
    sources: [],
    images: [],
    tags: [],
    customFields: [],
    createdAt: now,
    updatedAt: now,
    lots: [lot('IL 1')],
    ...partial,
  }
}

const current = place({
  id: 'po-5',
  names: [
    { lang: 'en', text: 'P&O Building (5th Generation)', primary: true },
    { lang: 'zh-Hant', text: '鐵行大廈（第五代）' },
  ],
  status: 'demolished',
  built: { year: 1966 },
  demolished: { year: 1980 },
})

const earlier = place({
  id: 'po-4',
  names: [
    { lang: 'en', text: 'P&O Building (4th Generation)', primary: true },
    { lang: 'zh-Hant', text: '鐵行大廈（第四代）' },
  ],
  status: 'demolished',
  built: { year: 1924, circa: true },
  demolished: { year: 1961, circa: true },
})

function render(locale: 'en' | 'hk') {
  return renderToStaticMarkup(
    createElement(EstablishmentDetail, {
      establishment: current,
      establishments: [current, earlier],
      locale,
      onSelect: () => {},
    }),
  )
}

describe('EstablishmentDetail', () => {
  it('translates demolished and omits standing from the date line', () => {
    expect(render('hk')).toContain('1966 – 1980 · 已拆卸')
    expect(render('en')).toContain('1966 – 1980 · Demolished')

    const standing = place({
      id: 'euro',
      names: [{ lang: 'en', text: 'Euro Trade Centre', primary: true }],
      status: 'standing',
      built: { year: 1982, month: 3, day: 3 },
    })
    const html = renderToStaticMarkup(
      createElement(EstablishmentDetail, {
        establishment: standing,
        establishments: [standing],
        locale: 'en',
        onSelect: () => {},
      }),
    )
    expect(html).toContain('1982-03-03')
    expect(html).not.toContain('–')
    expect(html).not.toContain('standing')
  })

  it('lists same-site places as catalog rows with a year and both names', () => {
    const html = render('en')
    expect(html).toContain('class="catalog catalog-site"')
    expect(html).toContain('class="catalog-year"')
    expect(html).toContain('1966')
    expect(html).toContain('P&amp;O Building (5th Generation)')
    expect(html).toContain('鐵行大廈（第五代）')
    expect(html).toContain('class="catalog-year catalog-year-circa catalog-hit"')
    expect(html).toContain('class="catalog-name catalog-hit"')
    expect(html).toContain('1924')
    expect(html).toContain('P&amp;O Building (4th Generation)')
  })

  it('shows photos, then notes, then the site timeline, then buildings and lots', () => {
    const html = renderToStaticMarkup(
      createElement(EstablishmentDetail, {
        establishment: { ...current, notes: 'Harbour frontage' },
        establishments: [current, earlier],
        locale: 'en',
        onSelect: () => {},
        photos: createElement('section', { id: 'photos-slot' }),
      }),
    )
    const order = ['photos-slot', 'Harbour frontage', 'On this site over time', 'IL 1'].map((marker) =>
      html.indexOf(marker),
    )
    expect(order.every((at) => at >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('puts edit in the header next to back, above the title', () => {
    const html = renderToStaticMarkup(
      createElement(EstablishmentDetail, {
        establishment: current,
        establishments: [current, earlier],
        locale: 'en',
        onSelect: () => {},
        onBack: () => {},
        onEdit: () => {},
      }),
    )
    const head = html.slice(html.indexOf('class="detail-head"'), html.indexOf('<h2>'))
    expect(head).toContain('detail-back')
    expect(head).toContain('class="detail-edit">Edit</button>')
    expect(html.match(/>Edit<\/button>/g)).toHaveLength(1)
  })

  it('marks the open place in the same-site list as current', () => {
    const html = render('en')
    expect(html).toContain('class="catalog-row catalog-row-current" aria-current="page"')
    expect(html.match(/catalog-row-current/g)).toHaveLength(1)
  })

  it('puts back in the header as an icon with aria-label when onBack is set', () => {
    const html = renderToStaticMarkup(
      createElement(EstablishmentDetail, {
        establishment: current,
        establishments: [current],
        locale: 'en',
        onSelect: () => {},
        onBack: () => {},
      }),
    )
    expect(html).toContain('aria-label="Back to site"')
    expect(html).toContain('class="ghost detail-back"')
    expect(html).toMatch(/detail-back[\s\S]*<h2>/)
    expect(html).not.toMatch(/<button[^>]*>Back to site<\/button>/)
  })

  it('omits the back control when onBack is missing', () => {
    const html = render('en')
    expect(html).not.toContain('detail-back')
    expect(html).not.toContain('aria-label="Back to site"')
  })
})
