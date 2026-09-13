import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

;(globalThis as unknown as { L: typeof L }).L = L

await import('leaflet-imageoverlay-rotated')

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
