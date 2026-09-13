import { openDB, type IDBPDatabase } from 'idb'
import type { DatasetEnvelope, MapOverlay, Place, Relation } from '../domain/types'
import type { PlaceStore } from './PlaceStore'
import { seedPlaces, seedRelations } from './seed'

const DB_NAME = 'hk-place-atlas'
const DB_VERSION = 1

type AtlasDB = {
  places: {
    key: string
    value: Place
  }
  relations: {
    key: string
    value: Relation
  }
  overlays: {
    key: string
    value: MapOverlay
  }
  overlayImages: {
    key: string
    value: Blob
  }
  meta: {
    key: string
    value: { seeded?: boolean }
  }
}

async function openAtlasDB(): Promise<IDBPDatabase<AtlasDB>> {
  return openDB<AtlasDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('places')) db.createObjectStore('places', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('relations')) db.createObjectStore('relations', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('overlays')) db.createObjectStore('overlays', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('overlayImages')) db.createObjectStore('overlayImages')
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    },
  })
}

export async function createLocalStore(): Promise<PlaceStore> {
  const db = await openAtlasDB()
  const seeded = await db.get('meta', 'seed')
  if (!seeded?.seeded) {
    const existing = await db.count('places')
    if (existing === 0) {
      const tx = db.transaction(['places', 'relations', 'meta'], 'readwrite')
      for (const place of seedPlaces) await tx.objectStore('places').put(place)
      for (const relation of seedRelations) await tx.objectStore('relations').put(relation)
      await tx.objectStore('meta').put({ seeded: true }, 'seed')
      await tx.done
    } else {
      await db.put('meta', { seeded: true }, 'seed')
    }
  }

  return {
    async listPlaces() {
      return db.getAll('places')
    },
    async getPlace(id) {
      return (await db.get('places', id)) ?? null
    },
    async savePlace(place) {
      await db.put('places', place)
      return place
    },
    async removePlace(id) {
      const relations = await db.getAll('relations')
      const tx = db.transaction(['places', 'relations'], 'readwrite')
      await tx.objectStore('places').delete(id)
      for (const relation of relations) {
        if (relation.fromId === id || relation.toId === id) {
          await tx.objectStore('relations').delete(relation.id)
        }
      }
      await tx.done
    },
    async listRelations() {
      return db.getAll('relations')
    },
    async saveRelation(relation) {
      await db.put('relations', relation)
      return relation
    },
    async removeRelation(id) {
      await db.delete('relations', id)
    },
    async listOverlays() {
      return db.getAll('overlays')
    },
    async saveOverlay(overlay) {
      await db.put('overlays', overlay)
      return overlay
    },
    async removeOverlay(id) {
      const tx = db.transaction(['overlays', 'overlayImages'], 'readwrite')
      await tx.objectStore('overlays').delete(id)
      await tx.objectStore('overlayImages').delete(id)
      await tx.done
    },
    async putOverlayImage(id, blob) {
      await db.put('overlayImages', blob, id)
    },
    async getOverlayImage(id) {
      return (await db.get('overlayImages', id)) ?? null
    },
    async exportAll() {
      return {
        version: 1 as const,
        places: await db.getAll('places'),
        relations: await db.getAll('relations'),
        overlays: await db.getAll('overlays'),
      }
    },
    async importAll(data: DatasetEnvelope) {
      const tx = db.transaction(['places', 'relations', 'overlays'], 'readwrite')
      await tx.objectStore('places').clear()
      await tx.objectStore('relations').clear()
      await tx.objectStore('overlays').clear()
      for (const place of data.places) await tx.objectStore('places').put(place)
      for (const relation of data.relations) await tx.objectStore('relations').put(relation)
      for (const overlay of data.overlays) await tx.objectStore('overlays').put(overlay)
      await tx.done
    },
  }
}
