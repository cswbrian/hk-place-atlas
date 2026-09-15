import type { AtlasRecord, MapOverlay, Place, Relation } from '../domain/types'

export type PlaceStore = {
  listPlaces(): Promise<Place[]>
  getPlace(id: string): Promise<Place | null>
  savePlace(place: Place): Promise<Place>
  removePlace(id: string): Promise<void>
  listRelations(): Promise<Relation[]>
  saveRelation(relation: Relation): Promise<Relation>
  removeRelation(id: string): Promise<void>
  listOverlays(): Promise<MapOverlay[]>
  saveOverlay(overlay: MapOverlay): Promise<MapOverlay>
  removeOverlay(id: string): Promise<void>
  putOverlayImage(id: string, blob: Blob): Promise<void>
  getOverlayImage(id: string): Promise<Blob | null>
  listRecords(): Promise<AtlasRecord[]>
  getRecord(id: string): Promise<AtlasRecord | null>
  saveRecord(record: AtlasRecord): Promise<AtlasRecord>
  removeRecord(id: string): Promise<void>
  putRecordImage(id: string, blob: Blob): Promise<void>
  getRecordImage(id: string): Promise<Blob | null>
}
