import type { Place, Relation } from '../domain/types'

const now = '2026-01-01T00:00:00.000Z'

function place(partial: Omit<Place, 'createdAt' | 'updatedAt' | 'notes' | 'sources' | 'images' | 'tags' | 'customFields'> & Partial<Place>): Place {
  return {
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

export const seedPlaces: Place[] = [
  place({
    id: 'gpo-queens-rd',
    names: [
      { lang: 'en', text: 'General Post Office (Queen’s Road at Pedder St)', primary: true },
      { lang: 'zh-Hant', text: '郵政總局（皇后大道中及畢打街）' },
    ],
    status: 'demolished',
    built: { year: 1865 },
    demolished: { year: 1921 },
    geometry: { type: 'Point', coordinates: [114.158, 22.2813] },
    locationLabel: 'Queen’s Road Central at Pedder Street',
    notes: 'Second GPO location. Institution moved to Connaught Road in 1911; the building stood until the 1921 land sale.',
    sources: [
      { label: 'Gwulo 6156', url: 'https://gwulo.com/node/6156' },
    ],
  }),
  place({
    id: 'gpo-connaught',
    names: [
      { lang: 'en', text: 'General Post Office (Connaught Rd / Pedder St)', primary: true },
      { lang: 'zh-Hant', text: '郵政總局（干諾道中及畢打街）' },
    ],
    status: 'demolished',
    built: { year: 1911, month: 6, day: 19 },
    demolished: { year: 1977 },
    geometry: { type: 'Point', coordinates: [114.1578, 22.283] },
    locationLabel: 'Connaught Road Central at Pedder Street',
    notes: 'Stood on the site of today’s World Wide House.',
    sources: [
      { label: 'Gwulo 3034', url: 'https://gwulo.com/node/3034' },
    ],
  }),
  place({
    id: 'gpo-current',
    names: [
      { lang: 'en', text: 'General Post Office (current)', primary: true },
      { lang: 'zh-Hant', text: '郵政總局（現址）' },
    ],
    status: 'standing',
    built: { year: 1976, month: 8, day: 11 },
    demolished: null,
    geometry: { type: 'Point', coordinates: [114.1586, 22.2836] },
    locationLabel: '2 Connaught Place',
    notes: 'Opened 11 August 1976.',
    sources: [
      { label: 'Gwulo 6544', url: 'https://gwulo.com/node/6544' },
    ],
  }),
  place({
    id: 'world-wide-house',
    names: [
      { lang: 'en', text: 'World Wide House', primary: true },
      { lang: 'zh-Hant', text: '環球大廈' },
    ],
    status: 'standing',
    built: { year: 1980 },
    demolished: null,
    geometry: { type: 'Point', coordinates: [114.1578, 22.283] },
    locationLabel: '19 Des Voeux Road Central',
    notes: 'Later place on the Connaught Road GPO site.',
    sources: [
      { label: 'Gwulo 3034', url: 'https://gwulo.com/node/3034' },
    ],
  }),
]

export const seedRelations: Relation[] = [
  {
    id: 'rel-inst-queens-connaught',
    fromId: 'gpo-queens-rd',
    toId: 'gpo-connaught',
    type: 'institution_successor',
  },
  {
    id: 'rel-inst-connaught-current',
    fromId: 'gpo-connaught',
    toId: 'gpo-current',
    type: 'institution_successor',
  },
]
