import type { BuildingSnapshot, LotSnapshot, Place } from '../domain/types'

export type SiteMapSite = {
  placeIds: string[]
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
}

export type SiteMapLayersInput = {
  editing: boolean
  site: SiteMapSite | null
  places: Place[]
  /** Year-/viewport-filtered places used while editing. */
  editPlaces: Place[]
  allBuildings: BuildingSnapshot[]
  allLots: LotSnapshot[]
  selectedId?: string | null
}

export type SiteMapLayers = {
  places: Place[]
  focusPlaceIds: string[]
  showPlacePolygons: boolean
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
}

function hasPolygon(place: Place): boolean {
  return place.geometry != null && place.geometry.type !== 'Point'
}

/** What MapView should draw: idle clean, site-scoped highlight, or full edit layers. */
export function siteMapLayers(input: SiteMapLayersInput): SiteMapLayers {
  if (input.editing) {
    const focusPlaceIds =
      input.site?.placeIds ?? (input.selectedId ? [input.selectedId] : [])
    return {
      places: input.editPlaces,
      focusPlaceIds,
      showPlacePolygons: true,
      buildings: input.allBuildings,
      lots: input.allLots,
    }
  }

  if (!input.site) {
    return {
      places: [],
      focusPlaceIds: [],
      showPlacePolygons: false,
      buildings: [],
      lots: [],
    }
  }

  const byId = new Map(input.places.map((place) => [place.id, place]))
  const sitePlaces = input.site.placeIds
    .map((id) => byId.get(id))
    .filter((place): place is Place => Boolean(place))

  return {
    places: sitePlaces.filter(hasPolygon),
    focusPlaceIds: input.site.placeIds,
    showPlacePolygons: false,
    buildings: input.site.buildings,
    lots: input.site.lots,
  }
}
