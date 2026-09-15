import L, { addBasemap, rotatedImageOverlay } from './leaflet'
import { useEffect, useRef } from 'react'
import type { BuildingSnapshot, LotSnapshot, MapOverlay, Place } from '../domain/types'
import { deriveStatus, primaryName } from '../domain/dates'
import { formatBuildingSummary, formatLotSummary } from '../domain/lots'
import { clickClosesRing, CLOSE_RING_PX } from './draw'
import { placeLngLat } from './geometry'

const HK_CENTER: L.LatLngExpression = [22.281, 114.158]
const MIN_LOT_ZOOM = 17

type OverlayView = MapOverlay & { url: string }

type Props = {
  places: Place[]
  selectedId: string | null
  /** Place ids whose full geometry should show (open site / selection). Others render as pins. */
  focusPlaceIds: string[]
  /** When true, all places use full geometry (edit mode). */
  showPlacePolygons: boolean
  visibleLots: LotSnapshot[]
  visibleBuildings: BuildingSnapshot[]
  attachedLotNumbers: string[]
  attachedBuildingIds: string[]
  overlays: OverlayView[]
  aligningId: string | null
  drawVertices: [number, number][]
  drawing: boolean
  onSelectPlace: (id: string, lng: number, lat: number) => void
  onClickLot: (lot: LotSnapshot, lng: number, lat: number) => void
  onClickBuilding: (building: BuildingSnapshot, lng: number, lat: number) => void
  onMapClick: (lng: number, lat: number) => void
  onClosePolygon: () => void
  onViewChange: (view: { west: number; south: number; east: number; north: number; zoom: number }) => void
  onOverlayCorners: (id: string, corners: MapOverlay['corners']) => void
}

export function MapView(props: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const placesLayer = useRef<L.LayerGroup>(L.layerGroup())
  const lotsLayer = useRef<L.LayerGroup>(L.layerGroup())
  const buildingsLayer = useRef<L.LayerGroup>(L.layerGroup())
  const overlayLayer = useRef<L.LayerGroup>(L.layerGroup())
  const drawLayer = useRef<L.LayerGroup>(L.layerGroup())
  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { zoomControl: true }).setView(HK_CENTER, 16)
    addBasemap(map)
    placesLayer.current.addTo(map)
    lotsLayer.current.addTo(map)
    buildingsLayer.current.addTo(map)
    overlayLayer.current.addTo(map)
    drawLayer.current.addTo(map)
    map.on('click', (event: L.LeafletMouseEvent) => {
      const vertices = propsRef.current.drawVertices
      if (propsRef.current.drawing && vertices.length >= 3) {
        const [lng, lat] = vertices[0]
        const firstPx = map.latLngToContainerPoint([lat, lng])
        const clickPx = map.latLngToContainerPoint(event.latlng)
        if (clickClosesRing(vertices.length, firstPx.distanceTo(clickPx), CLOSE_RING_PX)) {
          propsRef.current.onClosePolygon()
          return
        }
      }
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
    const focus = new Set(props.focusPlaceIds)
    for (const place of props.places) {
      if (!place.geometry) continue
      const selected = place.id === props.selectedId || focus.has(place.id)
      const status = deriveStatus(place)
      const color = status === 'standing' ? '#1f6b4a' : status === 'demolished' ? '#9a3412' : '#57534e'
      const useFullGeometry =
        props.showPlacePolygons || focus.has(place.id) || place.id === props.selectedId
      const asPin = !useFullGeometry || place.geometry.type === 'Point'

      if (asPin) {
        const lngLat = placeLngLat(place)
        if (!lngLat) continue
        const [lng, lat] = lngLat
        const marker = L.circleMarker([lat, lng], {
          radius: selected ? 9 : 6,
          color,
          fillColor: color,
          fillOpacity: selected ? 0.95 : 0.75,
          weight: selected ? 3 : 2,
          interactive: true,
        })
        marker.on('click', (event) => {
          L.DomEvent.stopPropagation(event)
          propsRef.current.onSelectPlace(place.id, event.latlng.lng, event.latlng.lat)
        })
        marker.bindTooltip(primaryName(place))
        marker.addTo(layer)
        continue
      }

      const geo = L.geoJSON(place.geometry, {
        interactive: true,
        style: {
          color,
          weight: selected ? 3 : 2,
          fillColor: color,
          fillOpacity: selected ? 0.35 : 0.2,
        },
      })
      geo.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        const latlng = (event as L.LeafletMouseEvent).latlng
        propsRef.current.onSelectPlace(place.id, latlng.lng, latlng.lat)
      })
      geo.bindTooltip(primaryName(place))
      geo.addTo(layer)
    }
  }, [props.places, props.selectedId, props.focusPlaceIds, props.showPlacePolygons])

  useEffect(() => {
    const layer = lotsLayer.current
    layer.clearLayers()
    for (const lot of props.visibleLots) {
      const attached = props.attachedLotNumbers.includes(lot.number)
      const geo = L.geoJSON(lot.geometry, {
        interactive: true,
        style: {
          color: attached ? '#b45309' : '#334155',
          weight: attached ? 3 : 1,
          fillColor: attached ? '#f59e0b' : '#64748b',
          fillOpacity: attached ? 0.2 : 0.04,
        },
      })
      geo.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        const latlng = (event as L.LeafletMouseEvent).latlng
        propsRef.current.onClickLot(lot, latlng.lng, latlng.lat)
      })
      geo.bindTooltip(formatLotSummary(lot).join('<br>'), {
        sticky: true,
        opacity: 0.95,
        className: 'lot-tooltip',
      })
      geo.addTo(layer)
    }
  }, [props.visibleLots, props.attachedLotNumbers])

  useEffect(() => {
    const layer = buildingsLayer.current
    layer.clearLayers()
    for (const building of props.visibleBuildings) {
      const attached = props.attachedBuildingIds.includes(building.buildingId)
      const geo = L.geoJSON(building.geometry, {
        interactive: true,
        style: {
          color: attached ? '#1d4ed8' : '#0f766e',
          weight: attached ? 3 : 2,
          fillColor: attached ? '#3b82f6' : '#14b8a6',
          fillOpacity: attached ? 0.4 : 0.18,
        },
      })
      geo.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        const latlng = (event as L.LeafletMouseEvent).latlng
        propsRef.current.onClickBuilding(building, latlng.lng, latlng.lat)
      })
      geo.bindTooltip(formatBuildingSummary(building).join('<br>'), {
        sticky: true,
        opacity: 0.95,
        className: 'lot-tooltip',
      })
      geo.addTo(layer)
    }
  }, [props.visibleBuildings, props.attachedBuildingIds])

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
    const closed = !props.drawing && props.drawVertices.length >= 3
    if (closed) {
      L.polygon(latlngs, {
        color: '#b91c1c',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        interactive: false,
      }).addTo(layer)
    } else {
      L.polyline(latlngs, { color: '#b91c1c', weight: 2 }).addTo(layer)
      if (props.drawVertices.length >= 3) {
        L.polyline([latlngs[latlngs.length - 1], latlngs[0]], {
          color: '#b91c1c',
          weight: 1,
          dashArray: '4 6',
          interactive: false,
        }).addTo(layer)
      }
    }
    latlngs.forEach((latlng, index) => {
      const first = index === 0
      const canClose = props.drawing && first && props.drawVertices.length >= 3
      const marker = L.circleMarker(latlng, {
        radius: first ? 8 : 4,
        color: '#b91c1c',
        fillColor: first ? '#fff' : '#b91c1c',
        fillOpacity: 1,
        weight: 2,
        interactive: canClose,
      })
      if (canClose) {
        marker.bindTooltip('Click to close', { direction: 'top' })
        marker.on('click', (event) => {
          L.DomEvent.stopPropagation(event)
          propsRef.current.onClosePolygon()
        })
      }
      marker.addTo(layer)
    })
  }, [props.drawVertices, props.drawing])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !props.selectedId) return
    const place = propsRef.current.places.find((item) => item.id === props.selectedId)
    if (!place) return
    const lngLat = placeLngLat(place)
    if (!lngLat) return
    const [lng, lat] = lngLat
    map.panTo([lat, lng], { animate: false })
  }, [props.selectedId])

  return <div ref={elRef} className="map" />
}

export { MIN_LOT_ZOOM }
