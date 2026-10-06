export const SEARCH_LIMIT = 20
export const SEARCH_FETCH = 50

const HAN = /\p{Script=Han}/u

export function fts5Query(raw: string): string | null {
  const latin = raw
    .replace(/\p{Script=Han}/gu, ' ')
    .replace(/["*^:(){}]/g, ' ')
    .split(/[^a-zA-Z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
  // Drop a lone one-letter query (too broad). Keep short letters when they sit
  // beside other terms so names like P&O still match.
  const terms = latin.filter((term) => term.length >= 2 || latin.length > 1)
  if (!terms.length) return null
  const parts: string[] = []
  for (let i = 0; i < terms.length; ) {
    if (terms[i]!.length === 1) {
      const letters = [terms[i]!]
      let j = i + 1
      while (j < terms.length && terms[j]!.length === 1) {
        letters.push(terms[j]!)
        j += 1
      }
      parts.push(letters.length === 1 ? `"${letters[0]}"` : `"${letters.join(' ')}"`)
      i = j
      continue
    }
    parts.push(`${terms[i]}*`)
    i += 1
  }
  return parts.join(' AND ')
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
