export type ApiRoute =
  | { type: 'feature'; slug: string }
  | { type: 'list' }
  | { type: 'recent' }
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
  | { type: 'photos' }
  | { type: 'photo'; id: string }
  | { type: 'photoThumb'; id: string }
  | { type: 'photoFile'; id: string }
  | { type: 'photoTags'; id: string }
  | { type: 'photoTag'; id: string; tagId: string }

export function parseApiRoute(url: URL): ApiRoute | null {
  const path = url.pathname.replace(/\/$/, '') || '/'
  if (path === '/api/features') return { type: 'list' }
  if (path === '/api/recent') return { type: 'recent' }
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
  if (path === '/api/photos') return { type: 'photos' }
  const photoThumb = /^\/api\/photos\/([^/]+)\/thumb$/.exec(path)
  if (photoThumb) return { type: 'photoThumb', id: decodeURIComponent(photoThumb[1]!) }
  const photoFile = /^\/api\/photos\/([^/]+)\/file$/.exec(path)
  if (photoFile) return { type: 'photoFile', id: decodeURIComponent(photoFile[1]!) }
  const photoTag = /^\/api\/photos\/([^/]+)\/tags\/([^/]+)$/.exec(path)
  if (photoTag) {
    return {
      type: 'photoTag',
      id: decodeURIComponent(photoTag[1]!),
      tagId: decodeURIComponent(photoTag[2]!),
    }
  }
  const photoTags = /^\/api\/photos\/([^/]+)\/tags$/.exec(path)
  if (photoTags) return { type: 'photoTags', id: decodeURIComponent(photoTags[1]!) }
  const photo = /^\/api\/photos\/([^/]+)$/.exec(path)
  if (photo) return { type: 'photo', id: decodeURIComponent(photo[1]!) }
  if (path === '/api/gis/buildings') return { type: 'gisBuildings' }
  if (path === '/api/gis/parcels') return { type: 'gisParcels' }
  if (path === '/api/gis/parcel-search') return { type: 'gisParcelSearch' }
  return null
}
