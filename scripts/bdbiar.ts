import { slugify, uniqueSlug, type Feature } from '../src/domain/feature.ts'
import type { BuildingBlockType, CustomField, FuzzyDate } from '../src/domain/types.ts'

export const BDBIAR_SEED_AT = '2026-01-01T00:00:00.000Z'
export const BDBIAR_SOURCE_URL = 'https://data.gov.hk'

export type BdbiarRecord = {
  buildingId: string
  addressEn: string
  addressZh: string
  opNumber: string
  occupiedAt: FuzzyDate | null
  blockType: BuildingBlockType | null
  useEn: string
  useZh: string
  lng: number
  lat: number
  district: string
  region: string
}

export function parseBdbiarCsv(text: string): Map<string, BdbiarRecord> {
  const rows = parseCsv(text)
  const header = rows[0]
  if (!header) return new Map()
  const col = Object.fromEntries(header.map((name, index) => [name, index]))
  const records = new Map<string, BdbiarRecord>()
  for (const row of rows.slice(1)) {
    const buildingId = cell(row, col.NSEARCH1_E)
    if (!buildingId) continue
    records.set(buildingId, {
      buildingId,
      addressEn: cell(row, col.ADDRESS_E),
      addressZh: cell(row, col.ADDRESS_C),
      opNumber: cell(row, col.NSEARCH2_E),
      occupiedAt: parseOpDate(cell(row, col.NSEARCH3_E)),
      blockType: parseBlockType(cell(row, col.NSEARCH4_E)),
      useEn: cell(row, col.NSEARCH5_E),
      useZh: cell(row, col.NSEARCH5_C),
      lng: Number(cell(row, col.LONGITUDE)),
      lat: Number(cell(row, col.LATITUDE)),
      district: cell(row, col.SEARCH1_E),
      region: cell(row, col.SEARCH2_E),
    })
  }
  return records
}

export function featureFromBdbiar(record: BdbiarRecord, extras: BdbiarRecord[] = []): Feature {
  const members = [record, ...extras]
  const customFields: CustomField[] = [
    ...members.map((item) => ({ key: 'bdbiarId', value: item.buildingId })),
    ...(record.opNumber ? [{ key: 'opNumber', value: record.opNumber }] : []),
    ...(record.useZh ? [{ key: 'useZh', value: record.useZh }] : []),
  ]
  return {
    id: `bdbiar-${record.buildingId}`,
    kind: 'establishment',
    slug: slugify(record.addressEn, record.occupiedAt?.year),
    nameEn: record.addressEn || `Building ${record.buildingId}`,
    nameZh: record.addressZh,
    status: 'standing',
    start: record.occupiedAt,
    end: null,
    lng: record.lng,
    lat: record.lat,
    body: {
      notes: '',
      sources: [{ label: 'Building information and age records', url: BDBIAR_SOURCE_URL }],
      images: [],
      tags: record.useEn ? [record.useEn] : [],
      customFields,
      district: record.district || undefined,
      region: record.region || undefined,
    },
    touched: false,
    createdAt: BDBIAR_SEED_AT,
    updatedAt: BDBIAR_SEED_AT,
  }
}

export function featuresFromBdbiar(records: Map<string, BdbiarRecord>): Feature[] {
  const groups = new Map<string, BdbiarRecord[]>()
  for (const record of records.values()) {
    const key = groupKey(record)
    const group = groups.get(key) ?? []
    group.push(record)
    groups.set(key, group)
  }
  const used = new Set<string>()
  return [...groups.values()].map((group) => {
    const canonical = group.find((item) => item.blockType === 'T') ?? group[0]!
    const extras = group.filter((item) => item !== canonical)
    const feature = featureFromBdbiar(canonical, extras)
    return { ...feature, slug: uniqueSlug(feature.slug, used) }
  })
}

function groupKey(record: BdbiarRecord): string {
  if (record.opNumber && record.addressEn) return `${record.opNumber}\n${record.addressEn}`
  return `id:${record.buildingId}`
}

function parseOpDate(value: string): FuzzyDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function parseBlockType(value: string): BuildingBlockType | null {
  if (value === 'Tower') return 'T'
  if (value === 'Podium') return 'P'
  return null
}

function cell(row: string[], index: number | undefined): string {
  if (index == null) return ''
  return row[index]?.trim() ?? ''
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      quoted = true
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((value) => value.length)) rows.push(row)
      row = []
      continue
    }
    field += ch
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}
