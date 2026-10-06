import { describe, expect, it } from 'vitest'
import { parseApiRoute } from './router'

describe('parseApiRoute', () => {
  it('matches a feature slug', () => {
    expect(parseApiRoute(new URL('https://x/api/features/bonham-towers-88-bonham-rd-1970'))).toEqual({
      type: 'feature',
      slug: 'bonham-towers-88-bonham-rd-1970',
    })
  })

  it('matches a bbox list', () => {
    expect(parseApiRoute(new URL('https://x/api/features?bbox=114,22,115,23&year=1980'))).toEqual({
      type: 'list',
    })
  })

  it('matches edges', () => {
    expect(parseApiRoute(new URL('https://x/api/edges?featureId=bdbiar-1'))).toEqual({
      type: 'edges',
      featureId: 'bdbiar-1',
    })
  })

  it('does not route the removed places directory', () => {
    expect(parseApiRoute(new URL('https://x/api/places?page=2&letter=J'))).toBeNull()
  })

  it('matches the recent updates list', () => {
    expect(parseApiRoute(new URL('https://x/api/recent'))).toEqual({ type: 'recent' })
  })

  it('matches wiki and auth routes', () => {
    expect(parseApiRoute(new URL('https://x/api/me'))).toEqual({ type: 'me' })
    expect(parseApiRoute(new URL('https://x/api/auth/google'))).toEqual({ type: 'authGoogle' })
    expect(parseApiRoute(new URL('https://x/api/auth/callback'))).toEqual({ type: 'authCallback' })
    expect(parseApiRoute(new URL('https://x/api/auth/logout'))).toEqual({ type: 'authLogout' })
    expect(parseApiRoute(new URL('https://x/api/overlay?bbox=114,22,115,23'))).toEqual({ type: 'overlay' })
    expect(parseApiRoute(new URL('https://x/api/search?q=high'))).toEqual({ type: 'search' })
    expect(parseApiRoute(new URL('https://x/api/audit?featureId=wiki-1'))).toEqual({
      type: 'audit',
      featureId: 'wiki-1',
    })
    expect(parseApiRoute(new URL('https://x/api/audit/aud-1/revert'))).toEqual({ type: 'auditRevert', id: 'aud-1' })
    expect(parseApiRoute(new URL('https://x/api/gis/buildings?bbox=114,22,114.2,22.3'))).toEqual({
      type: 'gisBuildings',
    })
    expect(parseApiRoute(new URL('https://x/api/gis/parcels?kind=lot&bbox=114,22,114.2,22.3'))).toEqual({
      type: 'gisParcels',
    })
    expect(parseApiRoute(new URL('https://x/api/gis/parcel-search?kind=lot&q=IL'))).toEqual({
      type: 'gisParcelSearch',
    })
    expect(parseApiRoute(new URL('https://x/api/photos?featureId=bdbiar-1'))).toEqual({ type: 'photos' })
    expect(parseApiRoute(new URL('https://x/api/photos/pic-1'))).toEqual({ type: 'photo', id: 'pic-1' })
    expect(parseApiRoute(new URL('https://x/api/photos/pic-1/thumb?size=map'))).toEqual({
      type: 'photoThumb',
      id: 'pic-1',
    })
  })

  it('ignores unknown paths', () => {
    expect(parseApiRoute(new URL('https://x/nope'))).toBeNull()
  })
})
