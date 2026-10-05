import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { CatalogGeojson } from '../domain/catalog'
import type { Bbox } from '../domain/featureQuery'
import { mapThumbs, thumbPath, type PhotoPin } from '../domain/photo'
import type { BuildingSnapshot, LotSnapshot } from '../domain/types'
import { OPENFREEMAP_ATTRIBUTION, OPENFREEMAP_BRIGHT_STYLE } from './basemap'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

setWorkerUrl(workerUrl)

const HK: [number, number] = [114.1694, 22.3193]
const EMPTY: CatalogGeojson = { type: 'FeatureCollection', features: [] }
const GIS_ZOOM = 17

type Props = {
  catalog: CatalogGeojson
  selectedId: string | null
  focus: Bbox | null
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
  photos: PhotoPin[]
  onPointClick: (lng: number, lat: number, bbox: Bbox, hitId: string | null) => void
  onPhotoClick: (featureId: string) => void
  onView: (bbox: Bbox, zoom: number) => void
}

function polygonCollection<T extends { geometry: Polygon | MultiPolygon }>(
  items: T[],
  idOf: (item: T) => string,
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items.map((item) => ({
      type: 'Feature',
      properties: { id: idOf(item) },
      geometry: item.geometry,
    })),
  }
}

function bboxOf(map: MapLibreMap): Bbox {
  const bounds = map.getBounds()
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  }
}

export function AtlasMap({
  catalog,
  selectedId,
  focus,
  buildings,
  lots,
  photos,
  onPointClick,
  onPhotoClick,
  onView,
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const catalogRef = useRef(catalog)
  const selectedRef = useRef(selectedId)
  const buildingsRef = useRef(buildings)
  const lotsRef = useRef(lots)
  const photosRef = useRef(photos)
  const onPoint = useRef(onPointClick)
  const onPhoto = useRef(onPhotoClick)
  const onViewRef = useRef(onView)
  const paintPhotosRef = useRef<() => void>(() => {})
  catalogRef.current = catalog
  selectedRef.current = selectedId
  buildingsRef.current = buildings
  lotsRef.current = lots
  photosRef.current = photos
  onPoint.current = onPointClick
  onPhoto.current = onPhotoClick
  onViewRef.current = onView

  useEffect(() => {
    if (!root.current) return
    const map = new MapLibreMap({
      container: root.current,
      style: OPENFREEMAP_BRIGHT_STYLE,
      center: HK,
      zoom: 11,
      minZoom: 9,
      maxZoom: 19,
      attributionControl: false,
    })
    map.addControl(
      new AttributionControl({ compact: true, customAttribution: `${OPENFREEMAP_ATTRIBUTION} · CSDI · LandsD` }),
    )
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    const selectedData = (): CatalogGeojson => {
      const id = selectedRef.current
      if (!id) return EMPTY
      const hit = catalogRef.current.features.find((feature) => feature.properties.id === id)
      return hit ? { type: 'FeatureCollection', features: [hit] } : EMPTY
    }

    const photoMarkers: Marker[] = []
    const paintPhotos = () => {
      for (const marker of photoMarkers) marker.remove()
      photoMarkers.length = 0
      const thumbs = mapThumbs(photosRef.current, map.getZoom())
      for (const thumb of thumbs) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'map-photo'
        const image = document.createElement('img')
        image.src = thumbPath(thumb.id, 'map')
        image.alt = ''
        button.append(image)
        if (thumb.count > 1) {
          const count = document.createElement('span')
          count.textContent = String(thumb.count)
          button.append(count)
        }
        button.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          onPhoto.current(thumb.featureId)
        })
        photoMarkers.push(
          new Marker({ element: button, anchor: 'left', offset: [14, 0] })
            .setLngLat([thumb.lng, thumb.lat])
            .addTo(map),
        )
      }
    }
    paintPhotosRef.current = paintPhotos

    map.on('load', () => {
      map.addSource('gis-lots', {
        type: 'geojson',
        data: polygonCollection(lotsRef.current, (lot) => lot.number),
      })
      map.addSource('gis-buildings', {
        type: 'geojson',
        data: polygonCollection(buildingsRef.current, (building) => building.buildingId),
      })
      map.addLayer({
        id: 'gis-lots-fill',
        type: 'fill',
        source: 'gis-lots',
        paint: { 'fill-color': '#64748b', 'fill-opacity': 0.12 },
      })
      map.addLayer({
        id: 'gis-lots-line',
        type: 'line',
        source: 'gis-lots',
        paint: { 'line-color': '#334155', 'line-width': 1 },
      })
      map.addLayer({
        id: 'gis-buildings-fill',
        type: 'fill',
        source: 'gis-buildings',
        paint: { 'fill-color': '#14b8a6', 'fill-opacity': 0.22 },
      })
      map.addLayer({
        id: 'gis-buildings-line',
        type: 'line',
        source: 'gis-buildings',
        paint: { 'line-color': '#0f766e', 'line-width': 2 },
      })
      map.addSource('catalog', {
        type: 'geojson',
        data: catalogRef.current,
        cluster: true,
        clusterMaxZoom: 16,
        clusterRadius: 50,
      })
      map.addSource('selected', { type: 'geojson', data: selectedData() })
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'catalog',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#111111',
          'circle-radius': ['step', ['get', 'point_count'], 14, 20, 18, 100, 24],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'catalog',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['Noto Sans Regular'],
        },
        paint: { 'text-color': '#ffffff' },
      })
      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'catalog',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'status'],
            'standing',
            '#1f6b4a',
            'demolished',
            '#9a3412',
            '#57534e',
          ],
          'circle-radius': 6,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      })
      map.addLayer({
        id: 'selected-pin',
        type: 'circle',
        source: 'selected',
        paint: {
          'circle-color': '#facc15',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#111111',
        },
      })
      void paintPhotos()
      const selected = catalogRef.current.features.find(
        (feature) => feature.properties.id === selectedRef.current,
      )
      if (selected?.geometry.type === 'Point') {
        map.easeTo({
          center: selected.geometry.coordinates as [number, number],
          zoom: Math.max(map.getZoom(), GIS_ZOOM),
        })
      }
    })

    map.on('click', (event: MapMouseEvent) => {
      if (!map.getLayer('clusters')) return
      const clusters = map.queryRenderedFeatures(event.point, { layers: ['clusters'] })
      const cluster = clusters[0]
      if (cluster && cluster.geometry.type === 'Point') {
        const clusterId = cluster.properties?.cluster_id
        const source = map.getSource('catalog')
        if (typeof clusterId === 'number' && source instanceof GeoJSONSource) {
          void source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
            map.easeTo({
              center: cluster.geometry.type === 'Point' ? (cluster.geometry.coordinates as [number, number]) : HK,
              zoom,
            })
          })
        }
        return
      }
      const pins = map.queryRenderedFeatures(event.point, { layers: ['unclustered'] })
      const pin = pins[0]
      const pinPoint = pin?.geometry.type === 'Point' ? (pin.geometry.coordinates as [number, number]) : null
      const lng = pinPoint?.[0] ?? event.lngLat.lng
      const lat = pinPoint?.[1] ?? event.lngLat.lat
      const hitId = typeof pin?.properties?.id === 'string' ? pin.properties.id : null
      if (map.getZoom() < GIS_ZOOM) {
        map.easeTo({ center: [lng, lat], zoom: GIS_ZOOM })
      }
      onPoint.current(lng, lat, bboxOf(map), hitId)
    })

    const pointer = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const reset = () => {
      map.getCanvas().style.cursor = ''
    }
    map.on('moveend', () => {
      onViewRef.current(bboxOf(map), map.getZoom())
      void paintPhotos()
    })
    map.on('mouseenter', 'clusters', pointer)
    map.on('mouseenter', 'unclustered', pointer)
    map.on('mouseenter', 'gis-buildings-fill', pointer)
    map.on('mouseenter', 'gis-lots-fill', pointer)
    map.on('mouseleave', 'clusters', reset)
    map.on('mouseleave', 'unclustered', reset)
    map.on('mouseleave', 'gis-buildings-fill', reset)
    map.on('mouseleave', 'gis-lots-fill', reset)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource('catalog')
    if (source instanceof GeoJSONSource) source.setData(catalog)
  }, [catalog])

  useEffect(() => {
    void paintPhotosRef.current()
  }, [photos])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource('selected')
    if (!(source instanceof GeoJSONSource)) return
    const hit = catalog.features.find((feature) => feature.properties.id === selectedId)
    source.setData(hit ? { type: 'FeatureCollection', features: [hit] } : EMPTY)
  }, [catalog, selectedId])

  useEffect(() => {
    const source = mapRef.current?.getSource('gis-buildings')
    if (source instanceof GeoJSONSource) {
      source.setData(polygonCollection(buildings, (building) => building.buildingId))
    }
  }, [buildings])

  useEffect(() => {
    const source = mapRef.current?.getSource('gis-lots')
    if (source instanceof GeoJSONSource) {
      source.setData(polygonCollection(lots, (lot) => lot.number))
    }
  }, [lots])

  const hadFocus = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!focus && !hadFocus.current) return
    let frame = 0
    const apply = () => {
      if (!map.isStyleLoaded()) {
        frame = requestAnimationFrame(apply)
        return
      }
      if (!focus) {
        hadFocus.current = false
        map.easeTo({ center: HK, zoom: 11 })
        return
      }
      hadFocus.current = true
      map.fitBounds(
        [
          [focus.west, focus.south],
          [focus.east, focus.north],
        ],
        { padding: { top: 120, left: 28, right: 28, bottom: 28 }, maxZoom: 14, duration: 700 },
      )
    }
    apply()
    return () => cancelAnimationFrame(frame)
  }, [focus])

  const selectedPoint = catalog.features.find((feature) => feature.properties.id === selectedId)
  const selectedLng = selectedPoint?.geometry.type === 'Point' ? selectedPoint.geometry.coordinates[0] : null
  const selectedLat = selectedPoint?.geometry.type === 'Point' ? selectedPoint.geometry.coordinates[1] : null

  useEffect(() => {
    const map = mapRef.current
    if (!map?.loaded() || selectedLng == null || selectedLat == null) return
    map.easeTo({ center: [selectedLng, selectedLat], zoom: Math.max(map.getZoom(), GIS_ZOOM) })
  }, [selectedLng, selectedLat])

  return <div ref={root} className="map atlas-map" />
}
