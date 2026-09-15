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

export type PlaceStatus = 'standing' | 'demolished' | 'unknown'

export type PlaceGeometry = Point | Polygon | MultiPolygon

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

export type Place = {
  id: string
  names: LocalizedName[]
  status: PlaceStatus
  built: FuzzyDate | null
  demolished: FuzzyDate | null
  geometry: PlaceGeometry | null
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

export type RecordLink =
  | { kind: 'place'; placeId: string }
  | { kind: 'building'; buildingId: string }
  | { kind: 'lot'; lotNumber: string }
  | { kind: 'point' }

export type AtlasRecord = {
  id: string
  title: string
  notes: string
  depictedAt?: FuzzyDate
  geometry?: Point
  urls: Source[]
  tags: string[]
  links: RecordLink[]
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

export type OverlayCorner = { lat: number; lng: number }

export type MapOverlay = {
  id: string
  title: string
  year?: number
  mimeType: string
  opacity: number
  corners: {
    nw: OverlayCorner
    ne: OverlayCorner
    se: OverlayCorner
  }
  visible: boolean
  createdAt: string
  updatedAt: string
}
