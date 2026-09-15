export const OPENFREEMAP_BRIGHT_STYLE = 'https://tiles.openfreemap.org/styles/bright'

export const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'

export function openFreeMapBrightOptions() {
  return {
    style: OPENFREEMAP_BRIGHT_STYLE,
    attribution: OPENFREEMAP_ATTRIBUTION,
  }
}
