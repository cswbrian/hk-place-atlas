import { describe, expect, it } from 'vitest'
import type { BuildingSnapshot, LotSnapshot, Place } from '../domain/types'
import { siteMapLayers } from './siteMapLayers'

function polyPlace(id: string, lng: number): Place {
  return {
    id,
    names: [{ lang: 'en', text: id, primary: true }],
    status: 'standing',
    built: null,
    demolished: null,
    geometry: {
      type: 'Polygon',
      coordinates: [[[lng, 22.28], [lng + 0.001, 22.28], [lng + 0.001, 22.281], [lng, 22.281], [lng, 22.28]]],
    },
    notes: '',
    sources: [],
    images: [],
    tags: [],
    customFields: [],
    createdAt: 't',
    updatedAt: 't',
  }
}

function pinPlace(id: string, lng: number): Place {
  return {
    ...polyPlace(id, lng),
    geometry: { type: 'Point', coordinates: [lng, 22.28] },
  }
}

function building(id: string): BuildingSnapshot {
  return {
    buildingId: id,
    geometry: {
      type: 'Polygon',
      coordinates: [[[114.15, 22.28], [114.151, 22.28], [114.151, 22.281], [114.15, 22.281], [114.15, 22.28]]],
    },
  }
}

function lot(number: string): LotSnapshot {
  return {
    number,
    geometry: {
      type: 'Polygon',
      coordinates: [[[114.15, 22.28], [114.151, 22.28], [114.151, 22.281], [114.15, 22.281], [114.15, 22.28]]],
    },
  }
}

const allBuildings = [building('b1'), building('b2')]
const allLots = [lot('IL 1'), lot('IL 2')]
const places = [polyPlace('p1', 114.15), pinPlace('p2', 114.16), polyPlace('p3', 114.17)]

describe('siteMapLayers', () => {
  it('keeps idle view empty', () => {
    expect(
      siteMapLayers({
        editing: false,
        site: null,
        places,
        editPlaces: places,
        allBuildings,
        allLots,
      }),
    ).toEqual({
      places: [],
      focusPlaceIds: [],
      showPlacePolygons: false,
      buildings: [],
      lots: [],
    })
  })

  it('shows site place polygons plus hit CSDI/lots when a site is open', () => {
    const result = siteMapLayers({
      editing: false,
      site: {
        placeIds: ['p1', 'p2'],
        buildings: [allBuildings[0]],
        lots: [allLots[0]],
      },
      places,
      editPlaces: places,
      allBuildings,
      allLots,
    })
    expect(result.places.map((p) => p.id)).toEqual(['p1'])
    expect(result.focusPlaceIds).toEqual(['p1', 'p2'])
    expect(result.showPlacePolygons).toBe(false)
    expect(result.buildings.map((b) => b.buildingId)).toEqual(['b1'])
    expect(result.lots.map((l) => l.number)).toEqual(['IL 1'])
  })

  it('uses full official layers while editing', () => {
    const result = siteMapLayers({
      editing: true,
      site: {
        placeIds: ['p1'],
        buildings: [allBuildings[0]],
        lots: [allLots[0]],
      },
      places,
      editPlaces: [places[0]],
      allBuildings,
      allLots,
      selectedId: 'p1',
    })
    expect(result.places).toEqual([places[0]])
    expect(result.focusPlaceIds).toEqual(['p1'])
    expect(result.showPlacePolygons).toBe(true)
    expect(result.buildings).toEqual(allBuildings)
    expect(result.lots).toEqual(allLots)
  })
})
