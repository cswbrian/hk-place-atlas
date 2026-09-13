import type { DatasetEnvelope, MapOverlay, Place, Relation } from '../domain/types'

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
  exportAll(): Promise<DatasetEnvelope>
  importAll(data: DatasetEnvelope): Promise<void>
}
