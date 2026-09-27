export type ApiRoute =
  | { type: 'feature'; slug: string }
  | { type: 'list' }
  | { type: 'places' }
  | { type: 'edges'; featureId: string }
  | { type: 'me' }
  | { type: 'authGoogle' }
  | { type: 'authCallback' }
  | { type: 'authLogout' }
  | { type: 'overlay' }
  | { type: 'search' }
  | { type: 'audit'; featureId: string }
  | { type: 'auditRevert'; id: string }
  | { type: 'gisBuildings' }
  | { type: 'gisParcels' }
  | { type: 'gisParcelSearch' }

export function parseApiRoute(url: URL): ApiRoute | null {
  const path = url.pathname.replace(/\/$/, '') || '/'
  if (path === '/api/features') return { type: 'list' }
  if (path === '/api/places') return { type: 'places' }
  const feature = /^\/api\/features\/([^/]+)$/.exec(path)
  if (feature) return { type: 'feature', slug: decodeURIComponent(feature[1]!) }
  if (path === '/api/edges') {
    const featureId = url.searchParams.get('featureId')
    if (!featureId) return null
    return { type: 'edges', featureId }
  }
  if (path === '/api/me') return { type: 'me' }
  if (path === '/api/auth/google') return { type: 'authGoogle' }
  if (path === '/api/auth/callback') return { type: 'authCallback' }
  if (path === '/api/auth/logout') return { type: 'authLogout' }
  if (path === '/api/overlay') return { type: 'overlay' }
  if (path === '/api/search') return { type: 'search' }
  if (path === '/api/audit') {
    const featureId = url.searchParams.get('featureId')
    if (!featureId) return null
    return { type: 'audit', featureId }
  }
  const revert = /^\/api\/audit\/([^/]+)\/revert$/.exec(path)
  if (revert) return { type: 'auditRevert', id: decodeURIComponent(revert[1]!) }
  if (path === '/api/gis/buildings') return { type: 'gisBuildings' }
  if (path === '/api/gis/parcels') return { type: 'gisParcels' }
  if (path === '/api/gis/parcel-search') return { type: 'gisParcelSearch' }
  return null
}
