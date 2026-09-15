import type { AtlasRecord, BuildingBlockType, BuildingSnapshot, CustomField, FuzzyDate, Place, Relation, Source } from './types'
import { addBuilding, placeGeometry } from './lots'
import { geometryContainsPoint } from './site'

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
    })
  }
  return records
}

export function placeFromBdbiar(record: BdbiarRecord, extras: BdbiarRecord[] = []): Place {
  const members = [record, ...extras]
  const customFields: CustomField[] = [
    ...members.map((item) => ({ key: 'bdbiarId', value: item.buildingId })),
    ...(record.opNumber ? [{ key: 'opNumber', value: record.opNumber }] : []),
    ...(record.useZh ? [{ key: 'useZh', value: record.useZh }] : []),
  ]
  return {
    id: `bdbiar-${record.buildingId}`,
    names: [
      { lang: 'en', text: record.addressEn || `Building ${record.buildingId}`, primary: true },
      { lang: 'zh-Hant', text: record.addressZh },
    ],
    status: 'standing',
    built: record.occupiedAt,
    demolished: null,
    geometry: { type: 'Point', coordinates: [record.lng, record.lat] },
    locationLabel: record.addressEn || undefined,
    notes: '',
    sources: [{ label: 'Building information and age records', url: BDBIAR_SOURCE_URL }],
    images: [],
    tags: record.useEn ? [record.useEn] : [],
    customFields,
    createdAt: BDBIAR_SEED_AT,
    updatedAt: BDBIAR_SEED_AT,
  }
}

export function placesFromBdbiar(records: Map<string, BdbiarRecord>): Place[] {
  const groups = new Map<string, BdbiarRecord[]>()
  for (const record of records.values()) {
    const key = groupKey(record)
    const group = groups.get(key) ?? []
    group.push(record)
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => {
    const canonical = group.find((item) => item.blockType === 'T') ?? group[0]!
    const extras = group.filter((item) => item !== canonical)
    return placeFromBdbiar(canonical, extras)
  })
}

export type BdbiarPlaceMerge = {
  places: Place[]
  removedIds: string[]
}

/** Insert missing BDBIAR places; collapse podium/tower duplicates; never overwrite user edits. */
export function mergeBdbiarPlaces(existing: Place[], seeded: Place[]): BdbiarPlaceMerge {
  const existingById = new Map(existing.map((place) => [place.id, place]))
  const removedIds: string[] = []
  const absorbed = new Set<string>()
  const result: Place[] = []
  const resultIds = new Set<string>()

  for (const seed of seeded) {
    const groupIds = new Set(placeBdbiarIds(seed))
    const members = existing.filter((place) => placeBdbiarIds(place).some((id) => groupIds.has(id)))
    let canonical = existingById.get(seed.id) ?? seed
    for (const member of members) {
      if (member.id === canonical.id) continue
      canonical = absorbPlace(canonical, member)
      removedIds.push(member.id)
      absorbed.add(member.id)
    }
    const nextFields = mergeBdbiarFields(canonical.customFields, seed.customFields)
    const fieldsChanged = JSON.stringify(nextFields) !== JSON.stringify(canonical.customFields)
    if (canonical === existingById.get(seed.id) && members.every((member) => member.id === canonical.id) && !fieldsChanged) {
      result.push(canonical)
      resultIds.add(canonical.id)
      continue
    }
    canonical = { ...canonical, customFields: nextFields }
    result.push(canonical)
    resultIds.add(canonical.id)
  }

  for (const place of existing) {
    if (absorbed.has(place.id) || resultIds.has(place.id)) continue
    result.push(place)
  }

  return { places: result, removedIds }
}

export function retargetPlaceId(
  fromId: string,
  toId: string,
  input: { relations: Relation[]; records: AtlasRecord[] },
): { relations: Relation[]; records: AtlasRecord[] } {
  if (fromId === toId) return input
  return {
    relations: input.relations.map((relation) => ({
      ...relation,
      fromId: relation.fromId === fromId ? toId : relation.fromId,
      toId: relation.toId === fromId ? toId : relation.toId,
    })),
    records: input.records.map((record) => ({
      ...record,
      links: record.links.map((link) =>
        link.kind === 'place' && link.placeId === fromId ? { ...link, placeId: toId } : link,
      ),
    })),
  }
}

export function placeBdbiarIds(place: Place): string[] {
  const ids = place.customFields.filter((field) => field.key === 'bdbiarId').map((field) => field.value)
  if (place.id.startsWith('bdbiar-')) {
    const fromId = place.id.slice('bdbiar-'.length)
    if (fromId && !ids.includes(fromId)) ids.push(fromId)
  }
  return ids
}

function groupKey(record: BdbiarRecord): string {
  if (record.opNumber && record.addressEn) return `${record.opNumber}\n${record.addressEn}`
  return `id:${record.buildingId}`
}

function absorbPlace(into: Place, from: Place): Place {
  let buildings = into.buildings ?? []
  for (const building of from.buildings ?? []) {
    buildings = addBuilding(buildings, building)
  }
  const lots = [...(into.lots ?? [])]
  for (const lot of from.lots ?? []) {
    if (!lots.some((item) => item.number === lot.number)) lots.push(lot)
  }
  return {
    ...into,
    notes: into.notes.trim() ? into.notes : from.notes,
    buildings: buildings.length ? buildings : into.buildings,
    lots: lots.length ? lots : into.lots,
    geometry: placeGeometry(buildings, lots, into.geometry) ?? into.geometry,
    customFields: mergeBdbiarFields(into.customFields, from.customFields),
    sources: mergeSources(into.sources, from.sources),
    images: mergeSources(into.images, from.images),
  }
}

function mergeBdbiarFields(into: CustomField[], from: CustomField[]): CustomField[] {
  const bdbiarIds: string[] = []
  for (const field of [...into, ...from]) {
    if (field.key === 'bdbiarId' && !bdbiarIds.includes(field.value)) bdbiarIds.push(field.value)
  }
  const rest = into.filter((field) => field.key !== 'bdbiarId' && field.key !== 'blockType')
  const extras = from.filter(
    (field) =>
      field.key !== 'bdbiarId'
      && field.key !== 'blockType'
      && !rest.some((item) => item.key === field.key && item.value === field.value),
  )
  return [...bdbiarIds.map((value) => ({ key: 'bdbiarId', value })), ...rest, ...extras]
}

function mergeSources(into: Source[], from: Source[]): Source[] {
  const list = [...into]
  for (const source of from) {
    if (list.some((item) => item.url === source.url && item.label === source.label)) continue
    list.push(source)
  }
  return list
}

function placeBlockType(place: Place): BuildingBlockType | null {
  const value = place.customFields.find((field) => field.key === 'blockType')?.value
  if (value === 'T' || value === 'P') return value
  return null
}

function placePoint(place: Place): [number, number] | null {
  if (!place.geometry) return null
  if (place.geometry.type === 'Point') {
    return [place.geometry.coordinates[0], place.geometry.coordinates[1]]
  }
  if (place.geometry.type === 'Polygon') {
    const ring = place.geometry.coordinates[0] ?? []
    if (!ring.length) return null
    const sum = ring.reduce<[number, number]>((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0])
    return [sum[0] / ring.length, sum[1] / ring.length]
  }
  const ring = place.geometry.coordinates[0]?.[0] ?? []
  if (!ring.length) return null
  const sum = ring.reduce<[number, number]>((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0])
  return [sum[0] / ring.length, sum[1] / ring.length]
}

export function findBdbiarPlaceForBuilding(
  places: Place[],
  building: BuildingSnapshot,
  record?: BdbiarRecord,
): Place | undefined {
  const wanted = new Set(
    [building.buildingId, record?.buildingId].filter((id): id is string => Boolean(id)),
  )
  let fallback: Place | undefined
  for (const place of places) {
    const ids = placeBdbiarIds(place)
    if (ids.length === 0) continue
    if ((place.buildings ?? []).some((item) => item.buildingId === building.buildingId)) {
      return place
    }
    if (ids.some((id) => wanted.has(id))) return place
    const point = placePoint(place)
    if (!point) continue
    if (!geometryContainsPoint(building.geometry, point)) continue
    const block = placeBlockType(place)
    if (block && block === building.blockType) return place
    fallback ??= place
  }
  return fallback
}

export function claimBuildingOntoPlace(place: Place, building: BuildingSnapshot): Place {
  const buildings = addBuilding(place.buildings, building)
  const geometry = placeGeometry(buildings, place.lots, place.geometry) ?? place.geometry
  return { ...place, buildings, geometry }
}

export function matchBdbiar(
  building: BuildingSnapshot,
  records: Map<string, BdbiarRecord>,
): BdbiarRecord | undefined {
  const byId = records.get(building.buildingId)
  if (byId) return byId
  let fallback: BdbiarRecord | undefined
  for (const record of records.values()) {
    if (!Number.isFinite(record.lng) || !Number.isFinite(record.lat)) continue
    if (!geometryContainsPoint(building.geometry, [record.lng, record.lat])) continue
    if (record.blockType && record.blockType === building.blockType) return record
    fallback ??= record
  }
  return fallback
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
