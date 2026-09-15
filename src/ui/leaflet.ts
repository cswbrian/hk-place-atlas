import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { openFreeMapBrightOptions } from './basemap'

setWorkerUrl(workerUrl)

;(globalThis as unknown as { L: typeof L }).L = L

await import('leaflet-imageoverlay-rotated')

export function addBasemap(map: L.Map) {
  const { style, attribution } = openFreeMapBrightOptions()
  maplibreGL({ style, attributionControl: false }).addTo(map)
  map.attributionControl?.addAttribution(attribution)
}

export function rotatedImageOverlay(
  url: string,
  topleft: L.LatLngExpression,
  topright: L.LatLngExpression,
  bottomleft: L.LatLngExpression,
  options?: L.ImageOverlayOptions,
): L.ImageOverlay {
  const factory = (L.imageOverlay as unknown as {
    rotated: typeof rotatedImageOverlay
  }).rotated
  return factory(url, topleft, topright, bottomleft, options)
}

export default L
