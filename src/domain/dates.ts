import type { FuzzyDate, Place, PlaceStatus } from './types'

export function formatFuzzyDate(date: FuzzyDate | null): string {
  if (!date) return '—'
  const month = date.month ? String(date.month).padStart(2, '0') : null
  const day = date.day && month ? String(date.day).padStart(2, '0') : null
  const core = [date.year, month, day].filter(Boolean).join('-')
  return date.circa ? `c. ${core}` : core
}

export function deriveStatus(place: Pick<Place, 'demolished' | 'status'>): PlaceStatus {
  if (place.demolished) return 'demolished'
  return place.status
}

export function primaryName(place: Pick<Place, 'names'>, lang: string = 'en'): string {
  const exact = place.names.find((name) => name.lang === lang && name.primary)
    ?? place.names.find((name) => name.primary)
    ?? place.names.find((name) => name.lang === lang)
    ?? place.names[0]
  return exact?.text ?? 'Untitled place'
}

export function yearOnlyIfDefaultJan1(date: FuzzyDate): FuzzyDate {
  if (date.month === 1 && date.day === 1) {
    return date.circa ? { year: date.year, circa: true } : { year: date.year }
  }
  return date
}

export function bilingualNames(place: Pick<Place, 'names'>): { en: string; zh: string | null } {
  const en = primaryName(place, 'en')
  const zh = place.names.find((name) => name.lang === 'zh-Hant')?.text.trim() || null
  return { en, zh: zh && zh !== en ? zh : null }
}
