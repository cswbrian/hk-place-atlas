import type { MultiPolygon, Point, Polygon } from 'geojson'

export type LangCode = 'en' | 'zh-Hant' | string

export type LocalizedName = {
  lang: LangCode
  text: string
  primary?: boolean
}

export type FuzzyDate = {
  year: number
  month?: number
  day?: number
  circa?: boolean
}

export type EstablishmentStatus = 'standing' | 'demolished' | 'unknown'

export type EstablishmentGeometry = Point | Polygon | MultiPolygon

export type ParcelKind = 'lot' | 'gla' | 'stt'

export type LotMetadata = {
  lotId?: string
  lotCode?: string
  lotNumber?: string
  lotNumberAlpha?: string
  sectionCode?: string
  lotType?: string
  lastUpdated?: string
}

export type LotSnapshot = {
  number: string
  geometry: Polygon
  /** Missing kind means a private lot (older exports). */
  kind?: ParcelKind
  metadata?: LotMetadata
}

export type BuildingBlockType = 'T' | 'P'

export type BuildingSnapshot = {
  buildingId: string
  blockType: BuildingBlockType
  nameEn?: string
  nameZh?: string
  occupiedYear?: number
  geometry: Polygon | MultiPolygon
}

export type Source = {
  label?: string
  url?: string
}

export type CustomField = {
  key: string
  value: string
}

export type Establishment = {
  id: string
  names: LocalizedName[]
  status: EstablishmentStatus
  built: FuzzyDate | null
  demolished: FuzzyDate | null
  geometry: EstablishmentGeometry | null
  lots?: LotSnapshot[]
  buildings?: BuildingSnapshot[]
  locationLabel?: string
  notes: string
  sources: Source[]
  images: Source[]
  tags: string[]
  customFields: CustomField[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export type RelationType = 'site_successor' | 'institution_successor'

export type Relation = {
  id: string
  fromId: string
  toId: string
  type: RelationType
  note?: string
}
