import { openDB, type IDBPDatabase } from 'idb'
import type { AtlasRecord, MapOverlay, Place, Relation } from '../domain/types'
import type { PlaceStore } from './PlaceStore'
import { seedPlaces, seedRelations } from './seed'

const DB_NAME = 'hk-place-atlas-v2'
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
  records: {
    key: string
    value: AtlasRecord
  }
  recordImages: {
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
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('recordImages')) db.createObjectStore('recordImages')
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
    async listRecords() {
      return db.getAll('records')
    },
    async getRecord(id) {
      return (await db.get('records', id)) ?? null
    },
    async saveRecord(record) {
      await db.put('records', record)
      return record
    },
    async removeRecord(id) {
      const tx = db.transaction(['records', 'recordImages'], 'readwrite')
      await tx.objectStore('records').delete(id)
      await tx.objectStore('recordImages').delete(id)
      await tx.done
    },
    async putRecordImage(id, blob) {
      await db.put('recordImages', blob, id)
    },
    async getRecordImage(id) {
      return (await db.get('recordImages', id)) ?? null
    },
  }
}
