import type { AtlasRecord, MapOverlay, Place, Relation } from '../domain/types'
import type { PlaceStore } from './PlaceStore'

export function createMemoryStore(initial?: {
  places?: Place[]
  relations?: Relation[]
  overlays?: MapOverlay[]
  records?: AtlasRecord[]
}): PlaceStore {
  const places = new Map((initial?.places ?? []).map((place) => [place.id, place]))
  const relations = new Map(
    (initial?.relations ?? []).map((relation) => [relation.id, relation]),
  )
  const overlays = new Map(
    (initial?.overlays ?? []).map((overlay) => [overlay.id, overlay]),
  )
  const records = new Map(
    (initial?.records ?? []).map((record) => [record.id, record]),
  )
  const images = new Map<string, Blob>()
  const recordImages = new Map<string, Blob>()

  return {
    async listPlaces() {
      return [...places.values()]
    },
    async getPlace(id) {
      return places.get(id) ?? null
    },
    async savePlace(place) {
      places.set(place.id, place)
      return place
    },
    async removePlace(id) {
      places.delete(id)
      for (const [relationId, relation] of relations) {
        if (relation.fromId === id || relation.toId === id) {
          relations.delete(relationId)
        }
      }
    },
    async listRelations() {
      return [...relations.values()]
    },
    async saveRelation(relation) {
      relations.set(relation.id, relation)
      return relation
    },
    async removeRelation(id) {
      relations.delete(id)
    },
    async listOverlays() {
      return [...overlays.values()]
    },
    async saveOverlay(overlay) {
      overlays.set(overlay.id, overlay)
      return overlay
    },
    async removeOverlay(id) {
      overlays.delete(id)
      images.delete(id)
    },
    async putOverlayImage(id, blob) {
      images.set(id, blob)
    },
    async getOverlayImage(id) {
      return images.get(id) ?? null
    },
    async listRecords() {
      return [...records.values()]
    },
    async getRecord(id) {
      return records.get(id) ?? null
    },
    async saveRecord(record) {
      records.set(record.id, record)
      return record
    },
    async removeRecord(id) {
      records.delete(id)
      recordImages.delete(id)
    },
    async putRecordImage(id, blob) {
      recordImages.set(id, blob)
    },
    async getRecordImage(id) {
      return recordImages.get(id) ?? null
    },
  }
}
