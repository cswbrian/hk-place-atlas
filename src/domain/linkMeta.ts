export type LinkMeta = {
  title?: string
  siteName?: string
  icon?: string
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const match = re.exec(tag)
  if (!match) return null
  return decodeEntities((match[1] ?? match[2] ?? match[3] ?? '').trim())
}

function metaContent(html: string, key: string): string | null {
  const re = /<meta\b[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const tag = match[0]
    const property = attr(tag, 'property') ?? attr(tag, 'name')
    if (property?.toLowerCase() !== key.toLowerCase()) continue
    const content = attr(tag, 'content')
    if (content) return content
  }
  return null
}

function titleTag(html: string): string | null {
  const match = /<title\b[^>]*>([^<]*)<\/title>/i.exec(html)
  if (!match?.[1]) return null
  const title = decodeEntities(match[1].trim())
  return title || null
}

function iconHref(html: string): string | null {
  const re = /<link\b[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const tag = match[0]
    const rel = (attr(tag, 'rel') ?? '').toLowerCase()
    if (!rel.split(/\s+/).some((part) => part === 'icon' || part === 'shortcut' || part.endsWith('icon'))) {
      continue
    }
    const href = attr(tag, 'href')
    if (href) return href
  }
  return null
}

function resolveUrl(href: string, base: string): string | null {
  try {
    const resolved = new URL(href, base)
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null
    return resolved.toString()
  } catch {
    return null
  }
}

export function parseLinkMeta(html: string, finalUrl: string): LinkMeta {
  const title = metaContent(html, 'og:title') ?? titleTag(html) ?? undefined
  let siteName = metaContent(html, 'og:site_name') ?? undefined
  if (!siteName) {
    try {
      siteName = new URL(finalUrl).hostname.replace(/^www\./, '')
    } catch {
      siteName = undefined
    }
  }
  const rawIcon = iconHref(html)
  const icon = resolveUrl(rawIcon ?? '/favicon.ico', finalUrl) ?? undefined
  return { title, siteName, icon }
}

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function linkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
