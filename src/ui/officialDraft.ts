import type { BdbiarRecord } from '../domain/bdbiar'
import { primaryName } from '../domain/dates'
import type { BuildingSnapshot, FuzzyDate, Place } from '../domain/types'
import { emptyDraft, type Draft } from './EntityForm'
import { geometryCentroid } from './geometry'

export function officialDraft(building: BuildingSnapshot, record?: BdbiarRecord): Draft {
  const occupied = record?.occupiedAt ?? null
  const nameEn = building.nameEn?.trim() || record?.addressEn || `Building ${building.buildingId}`
  const nameZh = building.nameZh?.trim() || record?.addressZh || ''
  const customFields = record?.opNumber
    ? [{ key: 'opNumber', value: record.opNumber }]
    : emptyDraft().customFields
  return {
    ...emptyDraft(),
    names: [
      { lang: 'en', text: nameEn, primary: true },
      { lang: 'zh-Hant', text: nameZh },
    ],
    status: 'standing',
    builtYear: datePart(occupied, 'year'),
    builtMonth: datePart(occupied, 'month'),
    builtDay: datePart(occupied, 'day'),
    locationLabel: record?.addressEn ?? '',
    tags: record?.useEn ?? '',
    customFields,
    buildings: [building],
    sources: record
      ? [{ label: 'Building information and age records', url: '' }]
      : emptyDraft().sources,
  }
}

export function previousOnSiteDraft(current: Place): Draft {
  const lots = current.lots ?? []
  const demolished = current.built
  return {
    ...emptyDraft(),
    names: [
      { lang: 'en', text: `Previous on ${primaryName(current)}`, primary: true },
      { lang: 'zh-Hant', text: '' },
    ],
    status: 'demolished',
    demolishedYear: datePart(demolished, 'year'),
    demolishedMonth: datePart(demolished, 'month'),
    demolishedDay: datePart(demolished, 'day'),
    locationLabel: current.locationLabel ?? '',
    lots,
    buildings: [],
    point: lots.length === 0 && current.geometry ? geometryCentroid(current.geometry) : null,
  }
}

function datePart(date: FuzzyDate | null | undefined, part: 'year' | 'month' | 'day'): string {
  if (!date) return ''
  if (part === 'year') return String(date.year)
  const value = date[part]
  return value ? String(value) : ''
}
