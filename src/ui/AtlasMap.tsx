import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  GeoJSONSource,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { CatalogGeojson } from '../domain/catalog'
import type { Bbox } from '../domain/featureQuery'
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
  buildings: BuildingSnapshot[]
  lots: LotSnapshot[]
  onPinClick: (slug: string, lng: number, lat: number) => void
  onMapClick: (lng: number, lat: number, bbox: Bbox) => void
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

export function AtlasMap({ catalog, selectedId, buildings, lots, onPinClick, onMapClick }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const catalogRef = useRef(catalog)
  const selectedRef = useRef(selectedId)
  const buildingsRef = useRef(buildings)
  const lotsRef = useRef(lots)
  const onPin = useRef(onPinClick)
  const onMap = useRef(onMapClick)
  catalogRef.current = catalog
  selectedRef.current = selectedId
  buildingsRef.current = buildings
  lotsRef.current = lots
  onPin.current = onPinClick
  onMap.current = onMapClick

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
      if (pin && pin.geometry.type === 'Point') {
        const slug = pin.properties?.slug
        if (typeof slug === 'string') {
          if (map.getZoom() < GIS_ZOOM) {
            map.easeTo({ center: pin.geometry.coordinates as [number, number], zoom: GIS_ZOOM })
          }
          onPin.current(slug, pin.geometry.coordinates[0], pin.geometry.coordinates[1])
        }
        return
      }
      if (map.getZoom() < GIS_ZOOM) {
        map.easeTo({ center: [event.lngLat.lng, event.lngLat.lat], zoom: GIS_ZOOM })
      }
      onMap.current(event.lngLat.lng, event.lngLat.lat, bboxOf(map))
    })

    const pointer = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const reset = () => {
      map.getCanvas().style.cursor = ''
    }
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
