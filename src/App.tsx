import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AtlasRecord,
  BuildingSnapshot,
  LotSnapshot,
  MapOverlay,
  Place,
  PlaceGeometry,
  Relation,
} from './domain/types'
import {
  matchBdbiar,
  parseBdbiarCsv,
  placesFromBdbiar,
  mergeBdbiarPlaces,
  findBdbiarPlaceForBuilding,
  claimBuildingOntoPlace,
  placeBdbiarIds,
  retargetPlaceId,
  type BdbiarRecord,
} from './domain/bdbiar'
import { mergeCommonsIngests, type CommonsIngest } from './domain/commons'
import { mergePlaceIngests, type PlaceIngest } from './domain/ingest'
import { applyMapPick, type LocationDraft, type MapPick } from './domain/mapPick'
import { placeByBuildingId, placeGeometry, removeBuilding, removeLot } from './domain/lots'
import { bilingualNames } from './domain/dates'
import { querySite, placeInBounds, type SiteQueryResult } from './domain/querySite'
import { compareSiteOrder, siteCluster } from './domain/site'
import { createLocalStore } from './storage/localStore'
import type { PlaceStore } from './storage/PlaceStore'
import { normalizeImages, normalizeSources } from './domain/links'
import { EntityForm, draftFromPlace, emptyDraft, type Draft } from './ui/EntityForm'
import { MapView, MIN_LOT_ZOOM } from './ui/MapView'
import { siteMapLayers } from './ui/siteMapLayers'
import { OverlayPanel } from './ui/OverlayPanel'
import { PlaceDetail } from './ui/PlaceDetail'
import { SitePanel } from './ui/SitePanel'
import {
  RecordForm,
  emptyRecordDraft,
  recordFromDraft,
  type RecordDraft,
} from './ui/RecordForm'
import { YearSlider } from './ui/YearSlider'
import { buildingVisibleInYear, maxYear, MIN_YEAR, placeStandingInYear } from './domain/yearView'
import { fetchBuildingsInWgsBounds } from './ui/buildings/buildingApi'
import { fetchLotByNumber, fetchLotsInWgsBounds } from './ui/lots/lotApi'
import { newId, nowIso } from './ui/ids'

type MapMode = 'browse' | 'record-point'
type ViewBounds = { west: number; south: number; east: number; north: number; zoom: number }

const commonsIngests = Object.values(
  import.meta.glob('../data/commons/*.json', { eager: true, import: 'default' }),
) as CommonsIngest[]

const placeIngests = Object.values(
  import.meta.glob('../data/ingest/*.json', { eager: true, import: 'default' }),
) as PlaceIngest[]

async function persistSeedIngests(store: PlaceStore) {
  const existing = {
    places: await store.listPlaces(),
    records: await store.listRecords(),
    relations: await store.listRelations(),
  }
  const merged = mergePlaceIngests(
    mergeCommonsIngests(existing, commonsIngests),
    placeIngests,
  )
  const placesById = new Map(existing.places.map((place) => [place.id, place]))
  for (const place of merged.places) {
    if (placesById.get(place.id) !== place) await store.savePlace(place)
  }
  const recordsById = new Map(existing.records.map((record) => [record.id, record]))
  for (const record of merged.records) {
    if (recordsById.get(record.id) !== record) await store.saveRecord(record)
  }
  const relationsById = new Map(existing.relations.map((relation) => [relation.id, relation]))
  for (const relation of merged.relations) {
    if (relationsById.get(relation.id) !== relation) await store.saveRelation(relation)
  }
}

function parseYear(value: string) {
  const year = Number(value)
  return Number.isInteger(year) && year > 0 ? year : null
}

function parsePart(value: string) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function draftFallbackGeometry(draft: Draft): PlaceGeometry | null {
  if (draft.polygon && draft.polygon.length >= 3) {
    const ring = draft.polygon.map(([lng, lat]) => [lng, lat])
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first)
    return { type: 'Polygon', coordinates: [ring] }
  }
  if (draft.point) return { type: 'Point', coordinates: draft.point }
  return null
}

function draftGeometry(draft: Draft): PlaceGeometry | null {
  return placeGeometry(draft.buildings ?? [], draft.lots ?? [], draftFallbackGeometry(draft))
}

function namesEmpty(draft: Draft): boolean {
  return !draft.names.some((name) => name.text.trim())
}

function prefillBuildingNames(draft: Draft, building: BuildingSnapshot): Draft['names'] {
  if (!namesEmpty(draft)) return draft.names
  const names = [...draft.names]
  if (building.nameEn) names[0] = { lang: 'en', text: building.nameEn, primary: true }
  if (building.nameZh) names[1] = { lang: 'zh-Hant', text: building.nameZh }
  return names
}

const NOW_YEAR = maxYear()
const EMPTY_IDS: string[] = []

export default function App() {
  const [store, setStore] = useState<PlaceStore | null>(null)
  const [viewYear, setViewYear] = useState(NOW_YEAR)
  const [places, setPlaces] = useState<Place[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [records, setRecords] = useState<AtlasRecord[]>([])
  const [overlays, setOverlays] = useState<MapOverlay[]>([])
  const [overlayUrls, setOverlayUrls] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [site, setSite] = useState<SiteQueryResult | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null)
  const [mode, setMode] = useState<MapMode>('browse')
  const [visibleLots, setVisibleLots] = useState<LotSnapshot[]>([])
  const [rawBuildings, setRawBuildings] = useState<BuildingSnapshot[]>([])
  const [viewBounds, setViewBounds] = useState<ViewBounds | null>(null)
  const [lotQuery, setLotQuery] = useState('')
  const [lotStatus, setLotStatus] = useState('')
  const [zoomHint, setZoomHint] = useState('Zoom in to load buildings and parcels')
  const [query, setQuery] = useState('')
  const [aligningId, setAligningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showOverlays, setShowOverlays] = useState(false)
  const [bdbiar, setBdbiar] = useState<Map<string, BdbiarRecord>>(new Map())

  const reload = useCallback(async (next: PlaceStore) => {
    setPlaces(await next.listPlaces())
    setRelations(await next.listRelations())
    setRecords(await next.listRecords())
    const list = await next.listOverlays()
    setOverlays(list)
    const urls: Record<string, string> = {}
    for (const overlay of list) {
      const blob = await next.getOverlayImage(overlay.id)
      if (blob) urls[overlay.id] = URL.createObjectURL(blob)
    }
    setOverlayUrls((prev) => {
      for (const url of Object.values(prev)) URL.revokeObjectURL(url)
      return urls
    })
  }, [])

  useEffect(() => {
    if (!store) return
    let cancelled = false
    fetch('/BDBIAR_Central_and_Western.csv')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load building age records')
        return response.text()
      })
      .then(async (text) => {
        if (cancelled) return
        const parsed = parseBdbiarCsv(text)
        setBdbiar(parsed)
        const seeded = placesFromBdbiar(parsed)
        const existing = await store.listPlaces()
        const { places: merged, removedIds } = mergeBdbiarPlaces(existing, seeded)
        const existingById = new Map(existing.map((place) => [place.id, place]))
        for (const place of merged) {
          if (existingById.get(place.id) !== place) await store.savePlace(place)
        }
        if (removedIds.length > 0) {
          let relations = await store.listRelations()
          let records = await store.listRecords()
          for (const removedId of removedIds) {
            const into = merged.find((place) =>
              placeBdbiarIds(place).some((id) => removedId === `bdbiar-${id}`),
            )
            if (into) {
              const next = retargetPlaceId(removedId, into.id, { relations, records })
              relations = next.relations
              records = next.records
            }
          }
          for (const relation of relations) await store.saveRelation(relation)
          for (const record of records) await store.saveRecord(record)
          for (const removedId of removedIds) await store.removePlace(removedId)
        }
      })
      .catch(() => {
        /* Map still works without BDBIAR seed. */
      })
      .then(async () => {
        if (cancelled) return
        await persistSeedIngests(store)
        if (!cancelled) await reload(store)
      })
    return () => {
      cancelled = true
    }
  }, [store, reload])

  useEffect(() => {
    let cancelled = false
    createLocalStore()
      .then(async (local) => {
        if (cancelled) return
        setStore(local)
        await reload(local)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to open store'))
    return () => {
      cancelled = true
    }
  }, [reload])

  const filtered = useMemo(() => {
    const standing = places.filter((item) => placeStandingInYear(item, viewYear, NOW_YEAR))
    const q = query.trim().toLowerCase()
    if (!q) return standing
    return standing.filter((item) =>
      item.names.some((name) => name.text.toLowerCase().includes(q))
      || (item.lots ?? []).some((lot) => lot.number.toLowerCase().includes(q)),
    )
  }, [places, query, viewYear])

  const mapPlaces = useMemo(() => {
    if (!viewBounds || viewBounds.zoom < MIN_LOT_ZOOM) {
      return filtered.filter((place) => !place.id.startsWith('bdbiar-') || (place.buildings?.length ?? 0) > 0)
    }
    return filtered.filter((place) => placeInBounds(place.geometry, viewBounds))
  }, [filtered, viewBounds])

  const selected = places.find((place) => place.id === selectedId) ?? null
  const overlayViews = useMemo(
    () =>
      overlays
        .filter((overlay) => overlayUrls[overlay.id])
        .map((overlay) => ({ ...overlay, url: overlayUrls[overlay.id] })),
    [overlays, overlayUrls],
  )
  const attachedLotNumbers = useMemo(
    () => draft?.lots.map((lot) => lot.number) ?? EMPTY_IDS,
    [draft],
  )
  const claimedBuildingIds = useMemo(() => {
    const ids = new Set<string>()
    for (const place of places) {
      for (const building of place.buildings ?? []) ids.add(building.buildingId)
    }
    for (const building of draft?.buildings ?? []) ids.add(building.buildingId)
    return [...ids]
  }, [places, draft])
  const visibleBuildings = useMemo(
    () =>
      rawBuildings
        .map((building) => enrichBuilding(building, bdbiar))
        .filter((building) => buildingVisibleInYear(building, viewYear, NOW_YEAR)),
    [rawBuildings, bdbiar, viewYear],
  )
  const editingPlace = Boolean(draft)
  /** Idle: clean basemap. Site open: that site’s polygons + hit CSDI/lots. Edit: full layers. */
  const layers = siteMapLayers({
    editing: editingPlace,
    site,
    places,
    editPlaces: mapPlaces,
    allBuildings: visibleBuildings,
    allLots: visibleLots,
    selectedId,
  })
  const renderedPlaces = layers.places
  const focusPlaceIds = layers.focusPlaceIds
  const mapLots = layers.lots
  const mapBuildings = layers.buildings

  function openSiteAt(lng: number, lat: number) {
    const next = querySite({
      lng,
      lat,
      buildings: visibleBuildings,
      lots: visibleLots,
      places,
      records,
    })
    setSite(next)
    setSelectedId(null)
    setDraft(null)
    setRecordDraft(null)
  }

  function openSiteFromPlace(place: Place) {
    if (!place.geometry) {
      setSelectedId(place.id)
      setSite(null)
      setDraft(null)
      setRecordDraft(null)
      return
    }
    const [lng, lat] = placeCentroid(place.geometry)
    const clustered = siteCluster(places, place.id, {
      nearbyPoints: place.geometry.type === 'Point',
    })
    const hit = querySite({
      lng,
      lat,
      buildings: visibleBuildings,
      lots: visibleLots,
      places,
      records,
    })
    const placeIds = [...new Set([...clustered, ...hit.placeIds.filter((id) => {
      const candidate = places.find((item) => item.id === id)
      if (!candidate) return false
      // Keep map-hit polygons/lots; drop stray nearby BDBIAR pins not in the cluster.
      if (clustered.includes(id)) return true
      return (candidate.lots ?? []).length > 0 || (candidate.buildings ?? []).length > 0 || (candidate.geometry != null && candidate.geometry.type !== 'Point')
    })])]
    setSite({
      ...hit,
      placeIds: placeIds
        .map((id) => places.find((item) => item.id === id))
        .filter((item): item is Place => Boolean(item))
        .sort(compareSiteOrder)
        .map((item) => item.id),
    })
    setSelectedId(null)
    setDraft(null)
    setRecordDraft(null)
  }

  async function persistPlace(nextDraft: Draft) {
    if (!store) return
    const geometry = draftGeometry(nextDraft)
    if (!geometry) {
      setError('Click a building or parcel, or a pin on the map.')
      return
    }
    const year = parseYear(nextDraft.builtYear)
    const demolishedYear = parseYear(nextDraft.demolishedYear)
    const id = nextDraft.id ?? newId()
    const now = nowIso()
    const existing = places.find((place) => place.id === id)
    const place: Place = {
      id,
      names: nextDraft.names.filter((name) => name.text.trim()),
      status: demolishedYear ? 'demolished' : nextDraft.status,
      built: year
        ? {
            year,
            month: parsePart(nextDraft.builtMonth),
            day: parsePart(nextDraft.builtDay),
            circa: nextDraft.builtCirca || undefined,
          }
        : null,
      demolished: demolishedYear
        ? {
            year: demolishedYear,
            month: parsePart(nextDraft.demolishedMonth),
            day: parsePart(nextDraft.demolishedDay),
            circa: nextDraft.demolishedCirca || undefined,
          }
        : null,
      geometry,
      lots: nextDraft.lots.length ? nextDraft.lots : undefined,
      buildings: (nextDraft.buildings ?? []).length ? nextDraft.buildings : undefined,
      locationLabel: nextDraft.locationLabel || undefined,
      notes: nextDraft.notes,
      sources: normalizeSources(nextDraft.sources),
      images: normalizeImages(nextDraft.images),
      tags: nextDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      customFields: nextDraft.customFields.filter((field) => field.key.trim()),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    if (!place.names.length) {
      setError('Give the place a name.')
      return
    }
    await store.savePlace(place)
    const current = await store.listRelations()
    for (const relation of current) {
      if (relation.fromId === id && relation.type === 'institution_successor') {
        await store.removeRelation(relation.id)
      }
    }
    if (nextDraft.institutionSuccessorId) {
      await store.saveRelation({
        id: newId(),
        fromId: id,
        toId: nextDraft.institutionSuccessorId,
        type: 'institution_successor',
      })
    }
    await reload(store)
    setDraft(null)
    setMode('browse')
    setError(null)
    if (site) {
      setSelectedId(null)
      setSite({
        ...site,
        placeIds: site.placeIds.includes(id) ? site.placeIds : [...site.placeIds, id],
      })
    } else {
      setSelectedId(id)
    }
  }

  async function deleteDraftPlace(nextDraft: Draft) {
    if (!store || !nextDraft.id) return
    await store.removePlace(nextDraft.id)
    await reload(store)
    setDraft(null)
    setMode('browse')
    setSelectedId(null)
    if (site) {
      setSite({
        ...site,
        placeIds: site.placeIds.filter((placeId) => placeId !== nextDraft.id),
      })
    }
  }

  function applyPickToDraft(current: Draft, pick: MapPick): Draft {
    const loc = applyMapPick(
      locationOf(current),
      pick,
      claimedByOtherPlaces(places, current.id),
    )
    const next = { ...current, ...loc }
    const added = loc.buildings.find(
      (building) => !(current.buildings ?? []).some((item) => item.buildingId === building.buildingId),
    )
    return added ? { ...next, names: prefillBuildingNames(next, added) } : next
  }

  async function persistRecord(nextDraft: RecordDraft) {
    if (!store) return
    const urls = normalizeSources(nextDraft.urls).filter((item) => item.url)
    if (!urls.length && !nextDraft.notes.trim() && !nextDraft.title.trim()) {
      setError('Paste a link, title, or notes for the record.')
      return
    }
    if (!nextDraft.point && nextDraft.placeIds.length === 0) {
      setError('Drop a pin or link at least one place.')
      return
    }
    const id = nextDraft.id ?? newId()
    const now = nowIso()
    const existing = records.find((record) => record.id === id) ?? null
    const record = recordFromDraft(nextDraft, existing, now, id, urls)
    await store.saveRecord(record)
    const nextRecords = await store.listRecords()
    await reload(store)
    setRecordDraft(null)
    setMode('browse')
    setError(null)
    if (record.geometry?.type === 'Point') {
      const [lng, lat] = record.geometry.coordinates
      const next = querySite({
        lng,
        lat,
        buildings: visibleBuildings,
        lots: visibleLots,
        places,
        records: nextRecords,
      })
      // Ensure the just-saved record appears even if place set is briefly stale.
      if (!next.recordIds.includes(record.id)) next.recordIds = [...next.recordIds, record.id]
      setSite(next)
      setSelectedId(null)
    }
  }

  function attachLot(lot: LotSnapshot, lng?: number, lat?: number) {
    const clickLng = lng ?? lot.geometry.coordinates[0]![0]![0]
    const clickLat = lat ?? lot.geometry.coordinates[0]![0]![1]
    if (!draft) {
      openSiteAt(clickLng, clickLat)
      return
    }
    setDraft(applyPickToDraft(draft, { lng: clickLng, lat: clickLat, lots: [lot] }))
  }

  function clickBuilding(building: BuildingSnapshot, lng: number, lat: number) {
    if (mode !== 'browse') return
    if (draft) {
      setDraft(applyPickToDraft(draft, { lng, lat, buildings: [building] }))
      return
    }
    openSiteAt(lng, lat)
  }

  async function claimVisibleBuildings(buildings: BuildingSnapshot[]) {
    if (!store || buildings.length === 0) return
    const current = await store.listPlaces()
    let changed = false
    const nextPlaces = [...current]
    for (const building of buildings) {
      if (placeByBuildingId(nextPlaces, building.buildingId)) continue
      const match = findBdbiarPlaceForBuilding(nextPlaces, building, matchBdbiar(building, bdbiar))
      if (!match) continue
      if ((match.buildings ?? []).some((item) => item.buildingId === building.buildingId)) continue
      const claimed = claimBuildingOntoPlace(match, building)
      const index = nextPlaces.findIndex((place) => place.id === match.id)
      if (index >= 0) nextPlaces[index] = claimed
      await store.savePlace(claimed)
      changed = true
    }
    if (changed) await reload(store)
  }

  async function onSearchLot() {
    setLotStatus('Searching…')
    try {
      const lot = await fetchLotByNumber(lotQuery)
      if (!lot) {
        setLotStatus('No parcel found')
        return
      }
      attachLot(lot)
      setLotStatus(`Added ${lot.number}`)
    } catch (err) {
      setLotStatus(err instanceof Error ? err.message : 'Search failed')
    }
  }

  async function onViewChange(view: ViewBounds) {
    if (sameBounds(viewBounds, view)) return
    setViewBounds(view)
    if (view.zoom < MIN_LOT_ZOOM) {
      setVisibleLots([])
      setRawBuildings([])
      setZoomHint('Zoom in to load buildings and parcels')
      return
    }
    setZoomHint('Click the map for site history')
    const [parcels, buildings] = await Promise.allSettled([
      fetchLotsInWgsBounds(view.west, view.south, view.east, view.north),
      fetchBuildingsInWgsBounds(view.west, view.south, view.east, view.north),
    ])
    if (parcels.status === 'fulfilled') setVisibleLots(parcels.value)
    else setVisibleLots([])
    if (buildings.status === 'fulfilled') {
      setRawBuildings(buildings.value)
      void claimVisibleBuildings(buildings.value)
    } else setRawBuildings([])
    if (parcels.status === 'rejected' && buildings.status === 'rejected') {
      const err = parcels.reason instanceof Error ? parcels.reason : new Error('Could not load map features')
      setZoomHint(err.message)
    }
  }

  function onMapClick(lng: number, lat: number) {
    if (mode === 'record-point') {
      setRecordDraft((current) => ({
        ...(current ?? emptyRecordDraft()),
        point: [lng, lat],
      }))
      setMode('browse')
      return
    }
    if (draft) {
      setDraft(applyPickToDraft(draft, { lng, lat }))
      return
    }
    openSiteAt(lng, lat)
  }

  async function onUploadOverlay(file: File) {
    if (!store) return
    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be under 20 MB')
      return
    }
    const id = newId()
    const now = nowIso()
    const overlay: MapOverlay = {
      id,
      title: file.name.replace(/\.[^.]+$/, ''),
      mimeType: file.type,
      opacity: 0.55,
      corners: {
        nw: { lat: 22.286, lng: 114.152 },
        ne: { lat: 22.286, lng: 114.164 },
        se: { lat: 22.276, lng: 114.164 },
      },
      visible: true,
      createdAt: now,
      updatedAt: now,
    }
    await store.saveOverlay(overlay)
    await store.putOverlayImage(id, file)
    await reload(store)
    setAligningId(id)
    setShowOverlays(true)
  }

  function startRecord(point?: [number, number] | null, placeIds: string[] = []) {
    setRecordDraft(emptyRecordDraft(point ?? null, placeIds))
    setDraft(null)
    setSelectedId(null)
    setSite(null)
    setMode('browse')
  }

  if (!store) {
    return <div className="boot">{error ?? 'Opening atlas…'}</div>
  }

  const listPlaces = query.trim()
    ? filtered.slice(0, 80)
    : filtered.filter((place) => !place.id.startsWith('bdbiar-')).slice(0, 80)

  return (
    <div className="app">
      <a className="skip-link" href="#atlas-sidebar">
        Skip to sidebar
      </a>
      <header className="chrome">
        <div>
          <h1>HK Place Atlas</h1>
          <p className="muted">
            {mode === 'record-point'
              ? 'Click the map to drop a point. Buildings and parcels will not be selected.'
              : zoomHint}
          </p>
        </div>
        <div className="chrome-actions">
          <input
            className="search"
            placeholder="Search names or lots"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            className="ghost"
            onClick={() => startRecord(site ? [site.lng, site.lat] : null, site?.placeIds ?? [])}
          >
            Add record
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setShowOverlays((value) => !value)}
          >
            Old maps
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="map-stack">
          <MapView
            places={renderedPlaces}
            selectedId={editingPlace ? selectedId : null}
            focusPlaceIds={focusPlaceIds}
            showPlacePolygons={layers.showPlacePolygons}
            visibleLots={mapLots}
            visibleBuildings={mapBuildings}
            attachedLotNumbers={attachedLotNumbers}
            attachedBuildingIds={claimedBuildingIds}
            overlays={overlayViews}
            aligningId={aligningId}
            drawVertices={draft?.polygon ?? []}
            drawing={false}
            onSelectPlace={(_id, lng, lat) => {
              if (draft || recordDraft) return
              openSiteAt(lng, lat)
            }}
            onClickLot={attachLot}
            onClickBuilding={clickBuilding}
            onMapClick={onMapClick}
            onClosePolygon={() => setMode('browse')}
            onViewChange={(view) => void onViewChange(view)}
            onOverlayCorners={(id, corners) => {
              setOverlays((current) => {
                const overlay = current.find((item) => item.id === id)
                if (overlay) {
                  void store.saveOverlay({ ...overlay, corners, updatedAt: nowIso() })
                }
                return current.map((item) => (item.id === id ? { ...item, corners } : item))
              })
            }}
          />
          <YearSlider min={MIN_YEAR} max={NOW_YEAR} value={viewYear} onChange={setViewYear} />
        </div>

        <aside id="atlas-sidebar" className="sidebar">
          {error && <p className="error">{error}</p>}
          {showOverlays && (
            <OverlayPanel
              overlays={overlays}
              aligningId={aligningId}
              onUpload={(file) => void onUploadOverlay(file)}
              onToggle={(id) => {
                const overlay = overlays.find((item) => item.id === id)
                if (!overlay) return
                const next = { ...overlay, visible: !overlay.visible }
                setOverlays((current) => current.map((item) => (item.id === id ? next : item)))
                void store.saveOverlay(next)
              }}
              onAlign={setAligningId}
              onOpacity={(id, opacity) => {
                const overlay = overlays.find((item) => item.id === id)
                if (!overlay) return
                const next = { ...overlay, opacity }
                setOverlays((current) => current.map((item) => (item.id === id ? next : item)))
                void store.saveOverlay(next)
              }}
              onDelete={(id) => {
                void store.removeOverlay(id).then(() => reload(store))
                if (aligningId === id) setAligningId(null)
              }}
            />
          )}

          {draft ? (
            <EntityForm
              draft={draft}
              places={places}
              lotQuery={lotQuery}
              lotStatus={lotStatus}
              onChange={setDraft}
              onLotQuery={setLotQuery}
              onSearchLot={() => void onSearchLot()}
              onRemoveLot={(number) => setDraft({ ...draft, lots: removeLot(draft.lots, number) })}
              onRemoveBuilding={(buildingId) =>
                setDraft({ ...draft, buildings: removeBuilding(draft.buildings, buildingId) })
              }
              onSave={() => void persistPlace(draft)}
              onCancel={() => {
                setDraft(null)
                setMode('browse')
                if (site) setSelectedId(null)
              }}
              onDelete={draft.id ? () => void deleteDraftPlace(draft) : undefined}
            />
          ) : recordDraft ? (
            <RecordForm
              draft={recordDraft}
              places={placesForRecordForm(places, recordDraft.placeIds)}
              onChange={setRecordDraft}
              onStartPoint={() => setMode('record-point')}
              onSave={() => void persistRecord(recordDraft)}
              onCancel={() => {
                setRecordDraft(null)
                setMode('browse')
              }}
            />
          ) : selected ? (
            <PlaceDetail
              place={selected}
              places={places}
              relations={relations}
              onEdit={() => setDraft(draftFromPlace(selected, relations))}
              onSelect={setSelectedId}
              onBack={site ? () => setSelectedId(null) : undefined}
            />
          ) : site ? (
            <SitePanel
              site={site}
              places={places}
              records={records}
              onEditPlace={(place) => {
                setDraft(draftFromPlace(place, relations))
                setSelectedId(null)
              }}
              onSelectPlace={(id) => setSelectedId(id)}
              onAddPlace={() => {
                setDraft(applyPickToDraft(emptyDraft(), {
                  lng: site.lng,
                  lat: site.lat,
                  buildings: site.buildings,
                  lots: site.lots,
                }))
                setSelectedId(null)
              }}
              onAddRecord={() => startRecord([site.lng, site.lat], site.placeIds)}
              onClose={() => setSite(null)}
            />
          ) : (
            <div className="welcome">
              <h2>Places</h2>
              <p className="hint">
                Zoom into Central and Western, then click the map for that site's timeline. Idle view is a clean basemap; click a site to see its polygons and the footprint under the click.
              </p>
              <ul className="catalog catalog-places">
                {listPlaces.map((place) => {
                  const { en, zh } = bilingualNames(place)
                  const year = place.built ?? place.demolished
                  return (
                    <li key={place.id} className="catalog-row">
                      <div className="catalog-name">
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => openSiteFromPlace(place)}
                        >
                          {en}
                        </button>
                        {zh && <p className="zh">{zh}</p>}
                      </div>
                      <span className="catalog-year">
                        {year ? (year.circa ? `c. ${year.year}` : year.year) : '—'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {mode === 'record-point' && (
            <p className="hint">Click the map to drop a point.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function placesForRecordForm(places: Place[], placeIds: string[]): Place[] {
  const byId = new Map(places.map((place) => [place.id, place]))
  const linked = placeIds
    .map((id) => byId.get(id))
    .filter((place): place is Place => Boolean(place))
  const extras = places
    .filter((place) => !placeIds.includes(place.id))
    .filter((place) => !place.id.startsWith('bdbiar-') || (place.buildings?.length ?? 0) > 0)
    .slice(0, 150)
  return [...linked, ...extras]
}

function locationOf(draft: Draft): LocationDraft {
  return {
    buildings: draft.buildings ?? [],
    lots: draft.lots ?? [],
    point: draft.point,
    polygon: draft.polygon,
  }
}

function claimedByOtherPlaces(places: Place[], exceptId?: string): Set<string> {
  const ids = new Set<string>()
  for (const place of places) {
    if (place.id === exceptId) continue
    for (const building of place.buildings ?? []) ids.add(building.buildingId)
  }
  return ids
}

function placeCentroid(geometry: PlaceGeometry): [number, number] {
  if (geometry.type === 'Point') return [geometry.coordinates[0], geometry.coordinates[1]]
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0] ?? []
    if (!ring.length) return [0, 0]
    const sum = ring.reduce<[number, number]>((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0])
    return [sum[0] / ring.length, sum[1] / ring.length]
  }
  const ring = geometry.coordinates[0]?.[0] ?? []
  if (!ring.length) return [0, 0]
  const sum = ring.reduce<[number, number]>((acc, pos) => [acc[0] + pos[0], acc[1] + pos[1]], [0, 0])
  return [sum[0] / ring.length, sum[1] / ring.length]
}

function sameBounds(a: ViewBounds | null, b: ViewBounds): boolean {
  if (!a) return false
  return a.zoom === b.zoom
    && a.west === b.west
    && a.south === b.south
    && a.east === b.east
    && a.north === b.north
}

function enrichBuilding(building: BuildingSnapshot, records: Map<string, BdbiarRecord>): BuildingSnapshot {
  const record = matchBdbiar(building, records)
  if (!record) return building
  return {
    ...building,
    nameEn: building.nameEn || record.addressEn || undefined,
    nameZh: building.nameZh || record.addressZh || undefined,
    occupiedYear: record.occupiedAt?.year,
  }
}
