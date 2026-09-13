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

export function primaryName(place: Place, lang: string = 'en'): string {
  const exact = place.names.find((name) => name.lang === lang && name.primary)
    ?? place.names.find((name) => name.primary)
    ?? place.names.find((name) => name.lang === lang)
    ?? place.names[0]
  return exact?.text ?? 'Untitled place'
}
