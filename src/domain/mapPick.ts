import type { BuildingSnapshot, LotSnapshot } from './types'
import { addBuilding, addLot } from './lots'
import { borrowPolygonVertices } from './borrow'

export type LocationDraft = {
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
  point: [number, number] | null
  polygon: [number, number][] | null
}

export type MapPick = {
  lng: number
  lat: number
  buildings?: BuildingSnapshot[]
  lots?: LotSnapshot[]
}

function hasPolygonLocation(draft: LocationDraft): boolean {
  return (
    draft.buildings.length > 0
    || draft.lots.length > 0
    || (draft.polygon != null && draft.polygon.length >= 3)
  )
}

export function applyMapPick(
  current: LocationDraft,
  pick: MapPick,
  claimedByOthers: ReadonlySet<string> = new Set(),
): LocationDraft {
  const hitBuildings = pick.buildings ?? []
  const hitLots = pick.lots ?? []

  if (hitBuildings.length === 0 && hitLots.length === 0) {
    if (hasPolygonLocation(current)) return current
    return {
      buildings: [],
      lots: [],
      point: [pick.lng, pick.lat],
      polygon: null,
    }
  }

  let buildings = current.buildings
  let polygon = current.polygon
  const onDraft = new Set(buildings.map((item) => item.buildingId))

  const toClaim = hitBuildings.filter(
    (building) => !onDraft.has(building.buildingId) && !claimedByOthers.has(building.buildingId),
  )
  const toBorrow = hitBuildings.filter(
    (building) => !onDraft.has(building.buildingId) && claimedByOthers.has(building.buildingId),
  )

  if (toClaim.length === 0 && toBorrow.length === 0 && hitLots.length === 0) {
    return current
  }

  for (const building of toClaim) {
    buildings = addBuilding(buildings, building)
  }

  if (toClaim.length > 0) {
    polygon = null
  } else if (toBorrow.length > 0 && buildings.length === 0) {
    polygon = borrowPolygonVertices(toBorrow[0]!.geometry)
  }

  let lots = current.lots
  for (const lot of hitLots) {
    lots = addLot(lots, lot)
  }

  return {
    buildings,
    lots,
    point: null,
    polygon,
  }
}
