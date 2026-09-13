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

export type LotSnapshot = {
  number: string
  geometry: Polygon
}

export type Source = {
  label: string
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
  geometry: PlaceGeometry
  lots?: LotSnapshot[]
  locationLabel?: string
  notes: string
  sources: Source[]
  tags: string[]
  customFields: CustomField[]
  createdAt: string
  updatedAt: string
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

export type DatasetEnvelope = {
  version: 1
  places: Place[]
  relations: Relation[]
  overlays: MapOverlay[]
}
