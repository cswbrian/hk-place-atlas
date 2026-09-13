import L, { rotatedImageOverlay } from './leaflet'
import { useEffect, useRef } from 'react'
import type { LotSnapshot, MapOverlay, Place } from '../domain/types'
import { deriveStatus, primaryName } from '../domain/dates'
import { placeLngLat } from './geometry'

const HK_CENTER: L.LatLngExpression = [22.281, 114.158]
const MIN_LOT_ZOOM = 17

type OverlayView = MapOverlay & { url: string }

type Props = {
  places: Place[]
  selectedId: string | null
  visibleLots: LotSnapshot[]
  attachedLotNumbers: string[]
  overlays: OverlayView[]
  aligningId: string | null
  drawVertices: [number, number][]
  onSelectPlace: (id: string) => void
  onClickLot: (lot: LotSnapshot) => void
  onMapClick: (lng: number, lat: number) => void
  onViewChange: (view: { west: number; south: number; east: number; north: number; zoom: number }) => void
  onOverlayCorners: (id: string, corners: MapOverlay['corners']) => void
}

export function MapView(props: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const placesLayer = useRef<L.LayerGroup>(L.layerGroup())
  const lotsLayer = useRef<L.LayerGroup>(L.layerGroup())
  const overlayLayer = useRef<L.LayerGroup>(L.layerGroup())
  const drawLayer = useRef<L.LayerGroup>(L.layerGroup())
  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { zoomControl: true }).setView(HK_CENTER, 16)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    placesLayer.current.addTo(map)
    lotsLayer.current.addTo(map)
    overlayLayer.current.addTo(map)
    drawLayer.current.addTo(map)
    map.on('click', (event: L.LeafletMouseEvent) => {
      propsRef.current.onMapClick(event.latlng.lng, event.latlng.lat)
    })
    const emitView = () => {
      const bounds = map.getBounds()
      propsRef.current.onViewChange({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        zoom: map.getZoom(),
      })
    }
    map.on('moveend', emitView)
    mapRef.current = map
    emitView()
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const layer = placesLayer.current
    layer.clearLayers()
    for (const place of props.places) {
      const selected = place.id === props.selectedId
      const status = deriveStatus(place)
      const color = status === 'standing' ? '#1f6b4a' : status === 'demolished' ? '#9a3412' : '#57534e'
      const geo = L.geoJSON(place.geometry, {
        style: {
          color,
          weight: selected ? 3 : 2,
          fillColor: color,
          fillOpacity: place.geometry.type === 'Point' ? 0 : 0.25,
        },
        pointToLayer: (_feature, latlng) =>
          L.circleMarker(latlng, {
            radius: selected ? 9 : 7,
            color,
            fillColor: color,
            fillOpacity: 0.9,
            weight: selected ? 3 : 2,
          }),
      })
      geo.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        propsRef.current.onSelectPlace(place.id)
      })
      geo.bindTooltip(primaryName(place))
      geo.addTo(layer)
    }
  }, [props.places, props.selectedId])

  useEffect(() => {
    const layer = lotsLayer.current
    layer.clearLayers()
    for (const lot of props.visibleLots) {
      const attached = props.attachedLotNumbers.includes(lot.number)
      const geo = L.geoJSON(lot.geometry, {
        style: {
          color: attached ? '#b45309' : '#334155',
          weight: attached ? 3 : 1,
          fillColor: attached ? '#f59e0b' : '#64748b',
          fillOpacity: attached ? 0.35 : 0.12,
        },
      })
      geo.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        propsRef.current.onClickLot(lot)
      })
      geo.bindTooltip(lot.number)
      geo.addTo(layer)
    }
  }, [props.visibleLots, props.attachedLotNumbers])

  useEffect(() => {
    const map = mapRef.current
    const layer = overlayLayer.current
    layer.clearLayers()
    if (!map) return
    for (const overlay of props.overlays) {
      if (!overlay.visible && overlay.id !== props.aligningId) continue
      const { nw, ne, se } = overlay.corners
      const sw: L.LatLngExpression = [
        nw.lat + (se.lat - ne.lat),
        nw.lng + (se.lng - ne.lng),
      ]
      const image = rotatedImageOverlay(
        overlay.url,
        [nw.lat, nw.lng],
        [ne.lat, ne.lng],
        sw,
        { opacity: overlay.opacity, interactive: false },
      )
      image.addTo(layer)

      if (overlay.id === props.aligningId) {
        const updateFrom = (which: 'nw' | 'ne' | 'se', latlng: L.LatLng) => {
          const next = {
            ...overlay.corners,
            [which]: { lat: latlng.lat, lng: latlng.lng },
          }
          propsRef.current.onOverlayCorners(overlay.id, next)
        }
        const mk = (latlng: L.LatLngExpression, which: 'nw' | 'ne' | 'se') =>
          L.marker(latlng, { draggable: true, zIndexOffset: 800 })
            .on('drag', (event) => {
              const marker = event.target as L.Marker
              updateFrom(which, marker.getLatLng())
            })
        mk([nw.lat, nw.lng], 'nw').addTo(layer)
        mk([ne.lat, ne.lng], 'ne').addTo(layer)
        mk([se.lat, se.lng], 'se').addTo(layer)
      }
    }
  }, [props.overlays, props.aligningId])

  useEffect(() => {
    const layer = drawLayer.current
    layer.clearLayers()
    if (props.drawVertices.length === 0) return
    const latlngs = props.drawVertices.map(([lng, lat]) => [lat, lng] as L.LatLngExpression)
    L.polyline(latlngs, { color: '#b91c1c', weight: 2 }).addTo(layer)
    for (const latlng of latlngs) {
      L.circleMarker(latlng, { radius: 4, color: '#b91c1c', fillOpacity: 1 }).addTo(layer)
    }
  }, [props.drawVertices])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !props.selectedId) return
    const place = props.places.find((item) => item.id === props.selectedId)
    if (!place) return
    const [lng, lat] = placeLngLat(place)
    map.panTo([lat, lng], { animate: true })
  }, [props.selectedId, props.places])

  return <div ref={elRef} className="map" />
}

export { MIN_LOT_ZOOM }
