import type { DatasetEnvelope } from '../domain/types'
import type { PlaceStore } from './PlaceStore'

export function createMemoryStore(
  initial?: Partial<DatasetEnvelope>,
): PlaceStore {
  const places = new Map((initial?.places ?? []).map((place) => [place.id, place]))
  const relations = new Map(
    (initial?.relations ?? []).map((relation) => [relation.id, relation]),
  )
  const overlays = new Map(
    (initial?.overlays ?? []).map((overlay) => [overlay.id, overlay]),
  )
  const images = new Map<string, Blob>()

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
    async exportAll() {
      return {
        version: 1,
        places: [...places.values()],
        relations: [...relations.values()],
        overlays: [...overlays.values()],
      }
    },
    async importAll(data) {
      places.clear()
      relations.clear()
      overlays.clear()
      for (const place of data.places) places.set(place.id, place)
      for (const relation of data.relations) relations.set(relation.id, relation)
      for (const overlay of data.overlays) overlays.set(overlay.id, overlay)
    },
  }
}
