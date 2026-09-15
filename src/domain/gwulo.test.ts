import { describe, expect, it } from 'vitest'
import { gwuloPlaceId, parseGwuloPlaceHtml } from './gwulo'

const gpoHtml = `
<html>
<script type="application/json" data-drupal-selector="drupal-settings-json">{"leaflet":{"leaflet-map":{"features":[{"group":true,"features":[{"type":"point","lat":22.282456,"lon":114.157785}]}]}}}</script>
<h1>General Post Office (Connaught Rd / Pedder St site) [1911-1977]</h1>
<div class="field field--name-field-current-condition"><div class="field__item">Demolished / No longer exists</div></div>
<div class="field field--name-field-date-completed"><time datetime="1911-06-19T12:00:00Z">19 Jun 1911</time></div>
<div class="field field--name-field-date-demolished"><time datetime="1977-01-01T12:00:00Z">1 Jan 1977</time></div>
<div class="field field--name-body field__item"><p>The second generation GPO stood on the site of today's World Wide House.</p></div>
<div class="field field--name-field-later-places"><a href="/node/6532">World Wide House [1980- ]</a></div>
<div class="node__links"><a href="/user/login">Log in</a> or <a href="/user/register">register</a></div>
</html>
`

const firstPoHtml = `
<html>
<script type="application/json" data-drupal-selector="drupal-settings-json">{"leaflet":{"leaflet-map":{"features":[{"group":true,"features":[{"type":"point","lat":22.278816,"lon":114.159907}]}]}}}</script>
<h1>First Hong Kong Post Office [1841-????]</h1>
<div class="field field--name-field-current-condition"><div class="field__item">Demolished / No longer exists</div></div>
<div class="field field--name-field-date-completed"><time datetime="1841-01-01T12:00:00Z">1 Jan 1841</time></div>
<div class="field field--name-body field__item"><p>A small Post Office has been erected and finished.</p></div>
</html>
`

describe('gwuloPlaceId', () => {
  it('uses the node id', () => {
    expect(gwuloPlaceId('https://gwulo.com/node/3034')).toBe('gwulo-3034')
  })
})

describe('parseGwuloPlaceHtml', () => {
  it('reads the Connaught Road GPO page', () => {
    const draft = parseGwuloPlaceHtml(gpoHtml, 'https://gwulo.com/node/3034')
    expect(draft.proposedId).toBe('gwulo-3034')
    expect(draft.names[0]).toEqual({
      lang: 'en',
      text: 'General Post Office (Connaught Rd / Pedder St site)',
      primary: true,
    })
    expect(draft.status).toBe('demolished')
    expect(draft.built).toEqual({ year: 1911, month: 6, day: 19 })
    expect(draft.demolished).toEqual({ year: 1977 })
    expect(draft.lng).toBe(114.157785)
    expect(draft.lat).toBe(22.282456)
    expect(draft.laterPlaceTitles).toEqual(['World Wide House'])
    expect(draft.notes).toContain('second generation GPO')
    expect(draft.customFields).toEqual([{ key: 'gwuloNode', value: '3034' }])
  })

  it('leaves demolished missing when the title end year is unknown', () => {
    const draft = parseGwuloPlaceHtml(firstPoHtml, 'https://gwulo.com/node/6593')
    expect(draft.proposedId).toBe('gwulo-6593')
    expect(draft.status).toBe('demolished')
    expect(draft.built).toEqual({ year: 1841 })
    expect(draft.demolished).toBeNull()
    expect(draft.lng).toBe(114.159907)
    expect(draft.lat).toBe(22.278816)
    expect(draft.laterPlaceTitles).toEqual([])
  })
})
