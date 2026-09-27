export const SEARCH_LIMIT = 20
export const SEARCH_FETCH = 50

const HAN = /\p{Script=Han}/u

export function fts5Query(raw: string): string | null {
  const latin = raw
    .replace(/\p{Script=Han}/gu, ' ')
    .replace(/["*^:(){}]/g, ' ')
    .split(/[^a-zA-Z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
  if (!latin.length) return null
  return latin.map((term) => `${term}*`).join(' AND ')
}

export function hanNeedle(raw: string): string | null {
  const han = [...raw].filter((char) => HAN.test(char)).join('')
  return han.length >= 2 ? han : null
}

export function mergeSearchIds(ftsIds: string[], hanIds: string[], cap = SEARCH_LIMIT): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const id of [...ftsIds, ...hanIds]) {
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(id)
    if (ids.length >= cap) break
  }
  return ids
}
