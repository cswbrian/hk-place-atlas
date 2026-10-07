import type { StyleSpecification } from 'maplibre-gl'

export const LANDSD_STYLE_URL =
  'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/basemap/WGS84/resources/styles/root.json'

export const LANDSD_TILE_MAX_ZOOM = 15

export const LANDSD_ATTRIBUTION =
  '<a href="https://www.landsd.gov.hk/" target="_blank" rel="noreferrer">Map from Lands Department</a> 地圖由地政總署提供'

function resolveAgainst(documentUrl: string, relative: string): string {
  if (/^https?:\/\//.test(relative)) return relative
  const url = new URL(documentUrl)
  const path = url.pathname.split('/')
  path.pop()
  for (const segment of relative.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') path.pop()
    else path.push(segment)
  }
  const trailing = relative.endsWith('/') ? '/' : ''
  return `${url.origin}${path.join('/')}${trailing}`
}

export function landsDepartmentMapStyle(
  style: StyleSpecification,
  documentUrl = LANDSD_STYLE_URL,
): StyleSpecification {
  const sources: StyleSpecification['sources'] = { ...style.sources }
  for (const [id, source] of Object.entries(sources)) {
    if (source.type !== 'vector' || !source.url) continue
    const { url, ...rest } = source
    const root = resolveAgainst(documentUrl, url)
    const tileRoot = root.endsWith('/') ? root : `${root}/`
    sources[id] = {
      ...rest,
      tiles: [`${tileRoot}tile/{z}/{y}/{x}.pbf`],
      maxzoom: Math.min(source.maxzoom ?? LANDSD_TILE_MAX_ZOOM, LANDSD_TILE_MAX_ZOOM),
      attribution: '',
    }
  }
  return {
    ...style,
    glyphs: style.glyphs ? resolveAgainst(documentUrl, style.glyphs) : style.glyphs,
    sprite: typeof style.sprite === 'string' ? resolveAgainst(documentUrl, style.sprite) : style.sprite,
    sources,
  }
}
