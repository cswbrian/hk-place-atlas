import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LotSnapshot, MapOverlay, Place, PlaceGeometry, Relation } from './domain/types'
import { addLot, combineLotGeometry, removeLot } from './domain/lots'
import { primaryName } from './domain/dates'
import { createLocalStore } from './storage/localStore'
import type { PlaceStore } from './storage/PlaceStore'
import { EntityForm, draftFromPlace, emptyDraft, type Draft } from './ui/EntityForm'
import { MapView, MIN_LOT_ZOOM } from './ui/MapView'
import { OverlayPanel } from './ui/OverlayPanel'
import { PlaceDetail } from './ui/PlaceDetail'
import { fetchLotByNumber, fetchLotsInWgsBounds } from './ui/lots/lotApi'
import { newId, nowIso } from './ui/ids'
import JSZip from 'jszip'

type MapMode = 'browse' | 'point' | 'draw'

function parseYear(value: string) {
  const year = Number(value)
  return Number.isInteger(year) && year > 0 ? year : null
}

function parsePart(value: string) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function draftGeometry(draft: Draft): PlaceGeometry | null {
  if (draft.lots.length > 0) return combineLotGeometry(draft.lots)
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

export default function App() {
  const [store, setStore] = useState<PlaceStore | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [overlays, setOverlays] = useState<MapOverlay[]>([])
  const [overlayUrls, setOverlayUrls] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [mode, setMode] = useState<MapMode>('browse')
  const [visibleLots, setVisibleLots] = useState<LotSnapshot[]>([])
  const [lotQuery, setLotQuery] = useState('')
  const [lotStatus, setLotStatus] = useState('')
  const [zoomHint, setZoomHint] = useState('Zoom in to load lot tiles')
  const [query, setQuery] = useState('')
  const [aligningId, setAligningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showOverlays, setShowOverlays] = useState(false)

  const reload = useCallback(async (next: PlaceStore) => {
    setPlaces(await next.listPlaces())
    setRelations(await next.listRelations())
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
    const q = query.trim().toLowerCase()
    if (!q) return places
    return places.filter((place) =>
      place.names.some((name) => name.text.toLowerCase().includes(q))
      || (place.lots ?? []).some((lot) => lot.number.toLowerCase().includes(q)),
    )
  }, [places, query])

  const selected = places.find((place) => place.id === selectedId) ?? null
  const overlayViews = overlays
    .filter((overlay) => overlayUrls[overlay.id])
    .map((overlay) => ({ ...overlay, url: overlayUrls[overlay.id] }))

  async function persistPlace(nextDraft: Draft) {
    if (!store) return
    const geometry = draftGeometry(nextDraft)
    if (!geometry) {
      setError('Add at least one lot, a point, or a drawn footprint.')
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
      locationLabel: nextDraft.locationLabel || undefined,
      notes: nextDraft.notes,
      sources: nextDraft.sources.filter((source) => source.label.trim()),
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
      if (relation.fromId === id && (relation.type === 'site_successor' || relation.type === 'institution_successor')) {
        await store.removeRelation(relation.id)
      }
    }
    if (nextDraft.siteSuccessorId) {
      await store.saveRelation({
        id: newId(),
        fromId: id,
        toId: nextDraft.siteSuccessorId,
        type: 'site_successor',
      })
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
    setSelectedId(id)
    setError(null)
  }

  function attachLot(lot: LotSnapshot) {
    setDraft((current) => {
      const base = current ?? emptyDraft()
      return { ...base, lots: addLot(base.lots, lot), point: null, polygon: null }
    })
    setMode('browse')
    setSelectedId(null)
  }

  async function onSearchLot() {
    setLotStatus('Searching…')
    try {
      const lot = await fetchLotByNumber(lotQuery)
      if (!lot) {
        setLotStatus('No lot found')
        return
      }
      attachLot(lot)
      setLotStatus(`Added ${lot.number}`)
    } catch (err) {
      setLotStatus(err instanceof Error ? err.message : 'Search failed')
    }
  }

  async function onViewChange(view: { west: number; south: number; east: number; north: number; zoom: number }) {
    if (view.zoom < MIN_LOT_ZOOM) {
      setVisibleLots([])
      setZoomHint('Zoom in to load lot tiles')
      return
    }
    setZoomHint('Click a lot to start or add to this place')
    try {
      const lots = await fetchLotsInWgsBounds(view.west, view.south, view.east, view.north)
      setVisibleLots(lots)
    } catch (err) {
      setZoomHint(err instanceof Error ? err.message : 'Could not load lots')
    }
  }

  function onMapClick(lng: number, lat: number) {
    if (mode === 'point') {
      setDraft((current) => ({
        ...(current ?? emptyDraft()),
        point: [lng, lat],
        lots: [],
        polygon: null,
      }))
      setMode('browse')
      return
    }
    if (mode === 'draw') {
      setDraft((current) => {
        const base = current ?? emptyDraft()
        const polygon = [...(base.polygon ?? []), [lng, lat] as [number, number]]
        return { ...base, polygon, lots: [], point: null }
      })
    }
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

  async function exportDataset() {
    if (!store) return
    const data = await store.exportAll()
    const hasImages = data.overlays.length > 0
    if (!hasImages) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      downloadBlob(blob, 'hk-place-atlas.json')
      return
    }
    const zip = new JSZip()
    zip.file('dataset.json', JSON.stringify(data, null, 2))
    for (const overlay of data.overlays) {
      const blob = await store.getOverlayImage(overlay.id)
      if (blob) {
        const ext = overlay.mimeType.includes('png') ? 'png' : 'jpg'
        zip.file(`maps/${overlay.id}.${ext}`, blob)
      }
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'hk-place-atlas.zip')
  }

  async function importDataset(file: File) {
    if (!store) return
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file)
      const json = await zip.file('dataset.json')?.async('string')
      if (!json) {
        setError('Zip is missing dataset.json')
        return
      }
      const data = JSON.parse(json)
      await store.importAll(data)
      for (const overlay of data.overlays ?? []) {
        const ext = overlay.mimeType?.includes('png') ? 'png' : 'jpg'
        const entry = zip.file(`maps/${overlay.id}.${ext}`) ?? zip.file(`maps/${overlay.id}.jpg`)
        if (entry) await store.putOverlayImage(overlay.id, await entry.async('blob'))
      }
    } else {
      await store.importAll(JSON.parse(await file.text()))
    }
    await reload(store)
  }

  if (!store) {
    return <div className="boot">{error ?? 'Opening atlas…'}</div>
  }

  return (
    <div className="app">
      <header className="chrome">
        <div>
          <h1>HK Place Atlas</h1>
          <p className="muted">{zoomHint}</p>
        </div>
        <div className="chrome-actions">
          <input
            className="search"
            placeholder="Search names or lots"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" onClick={() => { setDraft(emptyDraft()); setSelectedId(null); setMode('browse') }}>
            Add place
          </button>
          <button type="button" onClick={() => setShowOverlays((value) => !value)}>
            Old maps
          </button>
          <button type="button" onClick={exportDataset}>
            Export
          </button>
          <label className="upload-inline">
            Import
            <input
              type="file"
              accept=".json,.zip"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importDataset(file)
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </header>

      <div className="workspace">
        <MapView
          places={filtered}
          selectedId={selectedId}
          visibleLots={visibleLots}
          attachedLotNumbers={draft?.lots.map((lot) => lot.number) ?? []}
          overlays={overlayViews}
          aligningId={aligningId}
          drawVertices={mode === 'draw' ? (draft?.polygon ?? []) : []}
          onSelectPlace={(id) => {
            if (draft) return
            setSelectedId(id)
          }}
          onClickLot={attachLot}
          onMapClick={onMapClick}
          onViewChange={(view) => void onViewChange(view)}
          onOverlayCorners={(id, corners) => {
            setOverlays((current) => {
              const overlay = current.find((item) => item.id === id)
              if (overlay) {
                void store.saveOverlay({ ...overlay, corners, updatedAt: nowIso() })
              }
              return current.map((item) => item.id === id ? { ...item, corners } : item)
            })
          }}
        />

        <aside className="sidebar">
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
                setOverlays((current) => current.map((item) => item.id === id ? next : item))
                void store.saveOverlay(next)
              }}
              onAlign={setAligningId}
              onOpacity={(id, opacity) => {
                const overlay = overlays.find((item) => item.id === id)
                if (!overlay) return
                const next = { ...overlay, opacity }
                setOverlays((current) => current.map((item) => item.id === id ? next : item))
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
              onStartPoint={() => setMode('point')}
              onStartDraw={() => {
                setDraft({ ...draft, polygon: [], lots: [], point: null })
                setMode('draw')
              }}
              onSave={() => void persistPlace(draft)}
              onCancel={() => { setDraft(null); setMode('browse') }}
            />
          ) : selected ? (
            <PlaceDetail
              place={selected}
              places={places}
              relations={relations}
              onEdit={() => setDraft(draftFromPlace(selected, relations))}
              onDelete={() => {
                void store.removePlace(selected.id).then(() => reload(store))
                setSelectedId(null)
              }}
              onSelect={setSelectedId}
            />
          ) : (
            <div className="welcome">
              <h2>Places</h2>
              <p className="hint">Zoom into Central, click a lot, then fill in the building. Seed data is the GPO chain.</p>
              <ul className="place-list">
                {filtered.map((place) => (
                  <li key={place.id}>
                    <button type="button" className="linkish" onClick={() => setSelectedId(place.id)}>
                      {primaryName(place)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mode === 'draw' && (
            <p className="hint">Click the map to add vertices. Save when the outline is enough. Double-add is fine.</p>
          )}
          {mode === 'point' && <p className="hint">Click the map to drop a point.</p>}
        </aside>
      </div>
    </div>
  )
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
