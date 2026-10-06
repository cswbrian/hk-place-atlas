import type { ApiRoute } from '../src/api/router'

export type PublicRead = ApiRoute | { type: 'sitemap' }

const HOUR = 60 * 60

export function publicReadCacheSeconds(route: PublicRead, method: string): number | null {
  if (method !== 'GET') return null
  if (route.type === 'search') return 6 * HOUR
  if (route.type === 'recent') return 5 * 60
  if (route.type === 'sitemap') return 24 * HOUR
  return null
}
