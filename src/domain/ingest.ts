import type { AtlasRecord, CustomField, FuzzyDate, LocalizedName, Place, PlaceGeometry, PlaceStatus, Relation, Source } from './types'

export type PlaceSourceDraft = {
  kind: 'gwulo' | 'wikipedia' | 'generic'
  url: string
  proposedId: string
  names: LocalizedName[]
  status: PlaceStatus
  built: FuzzyDate | null
  demolished: FuzzyDate | null
  lat?: number
  lng?: number
  locationLabel?: string
  notes: string
  laterPlaceTitles: string[]
  sources: Source[]
  customFields: CustomField[]
}

export type PlaceIngest = {
  place: Place
  relations: Relation[]
  records?: AtlasRecord[]
}

export type IngestState = {
  places: Place[]
  records: AtlasRecord[]
  relations: Relation[]
}

export function ingestGaps(draft: {
  names: LocalizedName[]
  status: PlaceStatus
  built: FuzzyDate | null
  demolished: FuzzyDate | null
  geometry: PlaceGeometry | null
  locationLabel?: string
}): string[] {
  const gaps: string[] = []
  if (!draft.names.some((name) => name.lang === 'en' && name.text.trim())) gaps.push('en name')
  if (!draft.names.some((name) => name.lang === 'zh-Hant' && name.text.trim())) gaps.push('zh name')
  if (!draft.built) gaps.push('built')
  if (draft.status !== 'standing' && !draft.demolished) gaps.push('demolished')
  if (!draft.geometry) gaps.push('geometry')
  if (!draft.locationLabel?.trim()) gaps.push('locationLabel')
  return gaps
}

export function mergePlaceIngests(existing: IngestState, ingests: PlaceIngest[]): IngestState {
  const places = new Map(existing.places.map((place) => [place.id, place]))
  const records = new Map(existing.records.map((record) => [record.id, record]))
  const relations = new Map(existing.relations.map((relation) => [relation.id, relation]))

  for (const ingest of ingests) {
    const previous = places.get(ingest.place.id)
    places.set(ingest.place.id, previous ? keepUserGeometry(ingest.place, previous) : ingest.place)
    for (const record of ingest.records ?? []) records.set(record.id, record)
    for (const relation of ingest.relations) relations.set(relation.id, relation)
  }

  return {
    places: [...places.values()],
    records: [...records.values()],
    relations: [...relations.values()],
  }
}

function keepUserGeometry(seed: Place, previous: Place): Place {
  const claimed = Boolean(previous.lots?.length || previous.buildings?.length)
  return {
    ...seed,
    lots: previous.lots,
    buildings: previous.buildings,
    geometry: claimed ? previous.geometry : (seed.geometry ?? previous.geometry),
    createdAt: previous.createdAt,
  }
}
