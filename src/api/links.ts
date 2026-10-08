import type { LinkMeta } from '../domain/linkMeta'

export async function fetchLinkPreview(url: string): Promise<LinkMeta> {
  const response = await fetch(`/api/links/preview?url=${encodeURIComponent(url)}`)
  if (!response.ok) return {}
  return (await response.json()) as LinkMeta
}
