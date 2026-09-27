import type { FuzzyDate, Establishment, EstablishmentStatus } from './types'

export function formatFuzzyDate(date: FuzzyDate | null): string {
  if (!date) return '—'
  const month = date.month ? String(date.month).padStart(2, '0') : null
  const day = date.day && month ? String(date.day).padStart(2, '0') : null
  const core = [date.year, month, day].filter(Boolean).join('-')
  return date.circa ? `c. ${core}` : core
}

export function catalogYear(date: FuzzyDate | null | undefined): { text: string; circa: boolean } {
  if (!date) return { text: '—', circa: false }
  return { text: String(date.year), circa: Boolean(date.circa) }
}

export function deriveStatus(establishment: Pick<Establishment, 'demolished' | 'status'>): EstablishmentStatus {
  if (establishment.demolished) return 'demolished'
  return establishment.status
}

export function primaryName(establishment: Pick<Establishment, 'names'>, lang: string = 'en'): string {
  const exact = establishment.names.find((name) => name.lang === lang && name.primary)
    ?? establishment.names.find((name) => name.primary)
    ?? establishment.names.find((name) => name.lang === lang)
    ?? establishment.names[0]
  return exact?.text ?? 'Untitled place'
}

export function bilingualNames(establishment: Pick<Establishment, 'names'>): { en: string; zh: string | null } {
  const en = primaryName(establishment, 'en')
  const zh = establishment.names.find((name) => name.lang === 'zh-Hant')?.text.trim() || null
  return { en, zh: zh && zh !== en ? zh : null }
}
