import type { Source } from './types'

const MAX_LINK_TEXT = 56

function compactUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    let path = parsed.pathname
    try {
      path = decodeURIComponent(path)
    } catch {
      // keep the encoded path if it is malformed
    }
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    const display = path && path !== '/' ? `${host}${path}` : host
    if ([...display].length <= MAX_LINK_TEXT) return display
    return `${[...display].slice(0, MAX_LINK_TEXT - 1).join('')}…`
  } catch {
    return url
  }
}

export function linkText(link: Source): string {
  const label = link.label?.trim()
  if (label) return label
  if (!link.url) return ''
  return compactUrl(link.url)
}
