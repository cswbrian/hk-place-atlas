import { describe, expect, it } from 'vitest'
import { parseWikipediaPlace, wikiPlaceId } from './wikipedia'

const wheelockWikitext = `{{Infobox building
| name                    = Wheelock House
| native_name             = 會德豐大廈
| native_name_lang        = zh
| image_caption           = Wheelock House at the corner of Pedder Street and [[Des Voeux Road Central]].
| coordinates             = {{coord|22.2819|114.1574}}
| location_country        = {{flag|Hong Kong}}
| completion_date         = {{end date|1984}}
| demolished_date         =
| floor_count             = 24
}}
{{Short description|Office building in Hong Kong}}

'''Wheelock House''' (Chinese: 會德豐大廈) is a commercial office building located on Pedder Street in Central, Hong Kong.

== History ==
Wheelock House was built on the site where once stood three previous generations of [[Jardine House]].

{{commons category|Wheelock House}}
`

describe('wikiPlaceId', () => {
  it('slugs the article title', () => {
    expect(wikiPlaceId('https://en.wikipedia.org/wiki/Wheelock_House')).toBe('wiki-wheelock-house')
  })
})

describe('parseWikipediaPlace', () => {
  it('reads Wheelock House infobox fields', () => {
    const draft = parseWikipediaPlace({
      url: 'https://en.wikipedia.org/wiki/Wheelock_House',
      query: {
        query: {
          pages: [{
            title: 'Wheelock House',
            extract: 'Wheelock House (Chinese: 會德豐大廈) is a commercial office building located on Pedder Street in Central, Hong Kong. Wheelock House is a Class A office space completed in 1984 and has 24 storeys.',
            coordinates: [{ lat: 22.2819, lon: 114.1574 }],
            pageprops: { wikibase_item: 'Q7992331' },
            revisions: [{ slots: { main: { content: wheelockWikitext } } }],
          }],
        },
      },
    })
    expect(draft.proposedId).toBe('wiki-wheelock-house')
    expect(draft.names).toEqual([
      { lang: 'en', text: 'Wheelock House', primary: true },
      { lang: 'zh-Hant', text: '會德豐大廈' },
    ])
    expect(draft.status).toBe('standing')
    expect(draft.built).toEqual({ year: 1984 })
    expect(draft.demolished).toBeNull()
    expect(draft.lng).toBe(114.1574)
    expect(draft.lat).toBe(22.2819)
    expect(draft.locationLabel).toMatch(/Pedder Street/)
    expect(draft.notes).toContain('Pedder Street')
    expect(draft.sources.some((source) => source.url?.includes('Q7992331'))).toBe(true)
    expect(draft.sources.some((source) => source.url?.includes('commons.wikimedia.org'))).toBe(true)
    expect(draft.customFields).toEqual([{ key: 'wikipediaTitle', value: 'Wheelock House' }])
  })
})
