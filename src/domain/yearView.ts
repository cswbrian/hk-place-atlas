import type { BuildingSnapshot, Place } from './types'

export const MIN_YEAR = 1841

export function maxYear(now = new Date()): number {
  return now.getFullYear()
}

export function buildingVisibleInYear(
  building: Pick<BuildingSnapshot, 'occupiedYear'>,
  year: number,
  now: number,
): boolean {
  if (building.occupiedYear == null) return year === now
  return building.occupiedYear <= year
}

export function placeStandingInYear(
  place: Pick<Place, 'built' | 'demolished'>,
  year: number,
  now: number,
): boolean {
  if (place.demolished && year >= place.demolished.year) return false
  if (!place.built) return year === now
  return place.built.year <= year
}
