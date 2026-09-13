import type { MultiPolygon, Polygon } from 'geojson'
import type { LotSnapshot, Place } from './types'

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

export function addLot(lots: LotSnapshot[], lot: LotSnapshot): LotSnapshot[] {
  if (lots.some((existing) => existing.number === lot.number)) {
    return lots
  }
  return [...lots, lot]
}

export function removeLot(lots: LotSnapshot[], number: string): LotSnapshot[] {
  return lots.filter((lot) => lot.number !== number)
}

export function lotNumbers(place: Pick<Place, 'lots'>): string[] {
  return place.lots?.map((lot) => lot.number) ?? []
}
