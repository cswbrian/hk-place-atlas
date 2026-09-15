import type { MultiPolygon, Polygon } from 'geojson'
import type { BuildingSnapshot, LotSnapshot, Place, PlaceGeometry } from './types'

function polygonParts(geometry: Polygon | MultiPolygon): Polygon['coordinates'][] {
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  return geometry.coordinates
}

export function combineLotGeometry(
  lots: LotSnapshot[],
): Polygon | MultiPolygon {
  if (lots.length === 0) {
    throw new Error('combineLotGeometry requires at least one lot')
  }
  if (lots.length === 1) {
    return lots[0].geometry
  }
  return {
    type: 'MultiPolygon',
    coordinates: lots.map((lot) => lot.geometry.coordinates),
  }
}

export function combineBuildingGeometry(
  buildings: BuildingSnapshot[],
): Polygon | MultiPolygon {
  if (buildings.length === 0) {
    throw new Error('combineBuildingGeometry requires at least one building')
  }
  const parts = buildings.flatMap((building) => polygonParts(building.geometry))
  if (parts.length === 1) {
    return { type: 'Polygon', coordinates: parts[0] }
  }
  return { type: 'MultiPolygon', coordinates: parts }
}

export function placeGeometry(
  buildings: BuildingSnapshot[] | undefined,
  lots: LotSnapshot[] | undefined,
  fallback: PlaceGeometry | null,
): PlaceGeometry | null {
  if (buildings && buildings.length > 0) return combineBuildingGeometry(buildings)
  if (lots && lots.length > 0) return combineLotGeometry(lots)
  return fallback
}

export function addLot(lots: LotSnapshot[], lot: LotSnapshot): LotSnapshot[] {
  if (lots.some((existing) => existing.number === lot.number)) {
    return lots
  }
  return [...lots, lot]
}

export function removeLot(lots: LotSnapshot[], number: string): LotSnapshot[] {
  return lots.filter((lot) => lot.number !== number)
}

export function placeByBuildingId<T extends Pick<Place, 'buildings'>>(
  places: T[],
  buildingId: string,
): T | undefined {
  return places.find((place) =>
    (place.buildings ?? []).some((building) => building.buildingId === buildingId),
  )
}

export function addBuilding(
  buildings: BuildingSnapshot[] | undefined,
  building: BuildingSnapshot,
): BuildingSnapshot[] {
  const list = buildings ?? []
  if (list.some((existing) => existing.buildingId === building.buildingId)) {
    return list
  }
  return [...list, building]
}

export function removeBuilding(
  buildings: BuildingSnapshot[] | undefined,
  buildingId: string,
): BuildingSnapshot[] {
  return (buildings ?? []).filter((building) => building.buildingId !== buildingId)
}

export function lotNumbers(place: Pick<Place, 'lots'>): string[] {
  return place.lots?.map((lot) => lot.number) ?? []
}

export function formatLotSummary(lot: LotSnapshot): string[] {
  const kind = lot.kind ?? 'lot'
  const title =
    kind === 'gla' ? `GLA · ${lot.number}` : kind === 'stt' ? `STT · ${lot.number}` : lot.number
  const lines = [title]
  const metadata = lot.metadata
  if (!metadata) return lines
  if (metadata.sectionCode) lines.push(`Section ${metadata.sectionCode}`)
  if (metadata.lotType) lines.push(`Type ${metadata.lotType}`)
  if (metadata.lotId) lines.push(`Lot ID ${metadata.lotId}`)
  if (metadata.lastUpdated) lines.push(`Updated ${metadata.lastUpdated.slice(0, 10)}`)
  return lines
}

export function formatBuildingSummary(building: BuildingSnapshot): string[] {
  const label =
    building.nameEn?.trim()
    || building.nameZh?.trim()
    || `Building ${building.buildingId}`
  const lines = [label]
  if (building.occupiedYear) lines.push(`Occupied ${building.occupiedYear}`)
  if (building.nameEn && building.nameZh) lines.push(building.nameZh)
  lines.push(`ID ${building.buildingId}`)
  return lines
}
