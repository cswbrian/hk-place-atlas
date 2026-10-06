import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteFeature,
  fetchAudit,
  fetchEdges,
  fetchFeatureBySlug,
  fetchFeaturesInBbox,
  fetchMe,
  fetchOverlay,
  fetchRecent,
  revertAudit,
  saveFeature,
  type AtlasUser,
  type FeatureEdge,
} from './api/features'
import {
  catalogFeatureToFeature,
  mergeOverlay,
  type CatalogGeojson,
} from './domain/catalog'
import type { AuditEntry } from './domain/audit'
import { featureAsEstablishment, type Feature } from './domain/feature'
import { featureInBbox, type Bbox } from './domain/featureQuery'
import {
  copy,
  displayNames,
  featurePublicPath,
  parseFeaturePath,
  parseLocalePath,
  placesPageRedirect,
  switchLocalePath,
  type SiteLocale,
} from './domain/locale'
import { querySite, type SiteQueryResult } from './domain/querySite'
import { trackPageview } from './domain/analytics'
import { districtBbox } from './domain/districtView'
import { shouldLoadRecent, type RecentItem } from './domain/recent'
import { AtlasMap } from './ui/AtlasMap'
import { MapRegionChips } from './ui/MapRegionChips'
import { FeatureForm, emptyWikiDraft, wikiDraftFromFeature, wikiDraftToWrite, type WikiDraft } from './ui/FeatureForm'
import { FeaturePanel } from './ui/FeaturePanel'
import { gisAroundPoint } from './domain/gis'
import { wikiCanDelete } from './domain/wiki'
import { fetchBuildingsInWgsBounds } from './ui/buildings/buildingApi'
import { fetchLotsInWgsBounds } from './ui/lots/lotApi'
import { fetchPhotos } from './api/photos'
import { PHOTO_MAP_ZOOM, type PhotoPin } from './domain/photo'
import { PlacePhotos } from './ui/PlacePhotos'

const EMPTY_CATALOG: CatalogGeojson = { type: 'FeatureCollection', features: [] }
const HK_BBOX = { west: 113.8, south: 22.15, east: 114.45, north: 22.58 }

function canonicalPath(locale: SiteLocale, rest: string): string {
  return rest === '/' ? `/${locale}` : `/${locale}${rest}`
}

function stubNearby(catalog: CatalogGeojson, bbox: Bbox): Feature[] {
  return catalog.features
    .filter((feature) =>
      featureInBbox(feature.geometry.coordinates[0], feature.geometry.coordinates[1], bbox),
    )
    .map(catalogFeatureToFeature)
}

async function loadNearby(bbox: Bbox, catalog: CatalogGeojson): Promise<Feature[]> {
  try {
    return await fetchFeaturesInBbox(bbox)
  } catch {
    return stubNearby(catalog, bbox)
  }
}

function mergeSelected(features: Feature[], selected: Feature | null): Feature[] {
  if (!selected) return features
  if (features.some((feature) => feature.id === selected.id)) {
    return features.map((feature) => (feature.id === selected.id ? selected : feature))
  }
  return [selected, ...features]
}

function AtlasApp() {
  const [path, setPath] = useState(() => window.location.pathname)
  const [search, setSearch] = useState(() => window.location.search)
  const [catalog, setCatalog] = useState<CatalogGeojson>(EMPTY_CATALOG)
  const [site, setSite] = useState<SiteQueryResult | null>(null)
  const [nearby, setNearby] = useState<Feature[]>([])
  const [selected, setSelected] = useState<Feature | null>(null)
  const [hitId, setHitId] = useState<string | null>(null)
  const [edges, setEdges] = useState<FeatureEdge[]>([])
  const [audit, setAudit] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<Feature[]>([])
  const [user, setUser] = useState<AtlasUser | null>(null)
  const [auth, setAuth] = useState(false)
  const [draft, setDraft] = useState<WikiDraft | null>(null)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [mapRegion, setMapRegion] = useState<string | null>(null)
  const [mapDistrict, setMapDistrict] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [mapPhotos, setMapPhotos] = useState<PhotoPin[]>([])
  const siteRef = useRef<SiteQueryResult | null>(null)
  const bboxRef = useRef<Bbox | null>(null)
  const selectedRef = useRef<Feature | null>(null)
  const siteRequest = useRef(0)
  const photoRequest = useRef(0)
  const mapView = useRef<{ bbox: Bbox; zoom: number } | null>(null)
  const historyOpen = useRef(false)
  const loadHistory = useCallback((featureId: string) => {
    historyOpen.current = true
    void fetchAudit(featureId)
      .then((rows) => {
        if (historyOpen.current) setAudit(rows)
      })
      .catch(() => {
        if (historyOpen.current) setAudit([])
      })
  }, [])
  const closeHistory = useCallback(() => {
    historyOpen.current = false
    setAudit((current) => (current === null ? current : null))
  }, [])
  const loadMapPhotos = useCallback((bbox: Bbox, zoom: number) => {
    mapView.current = { bbox, zoom }
    const request = ++photoRequest.current
    if (zoom < PHOTO_MAP_ZOOM) {
      setMapPhotos([])
      return
    }
    void fetchPhotos({ bbox })
      .then((rows) => {
        if (request === photoRequest.current) setMapPhotos(rows)
      })
      .catch(() => {
        if (request === photoRequest.current) setMapPhotos([])
      })
  }, [])
  siteRef.current = site

  const { locale, rest } = parseLocalePath(path)
  const featurePath = parseFeaturePath(rest)
  const text = copy[locale]
  const otherLocale: SiteLocale = locale === 'en' ? 'zh-hk' : 'en'
  const visible = useMemo(() => mergeOverlay(catalog, overlay), [catalog, overlay])
  const mapFocus = mapDistrict ? districtBbox(mapDistrict) : null

  const go = useCallback((next: string) => {
    window.history.pushState({}, '', next)
    const url = new URL(next, window.location.origin)
    setPath(url.pathname)
    setSearch(url.search)
  }, [])

  useEffect(() => {
    const redirected = placesPageRedirect(path)
    if (redirected) {
      window.history.replaceState({}, '', redirected)
      setPath(redirected)
      setSearch('')
      return
    }
    const next = canonicalPath(locale, rest)
    const nextWithSearch = `${next}${search}`
    if (`${window.location.pathname}${window.location.search}` !== nextWithSearch) {
      window.history.replaceState({}, '', nextWithSearch)
      setPath(next)
      setSearch(search)
    }
    document.documentElement.lang = locale === 'zh-hk' ? 'zh-Hant-HK' : 'en'
    document.title = selected ? `${displayNames(selected, locale).title} · ${text.title}` : text.title
  }, [path, locale, rest, text.title, selected, search])

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname)
      setSearch(window.location.search)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    trackPageview(`${path}${search}`)
  }, [path, search])

  useEffect(() => {
    fetch('/catalog.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('missing catalog')
        return response.json() as Promise<CatalogGeojson>
      })
      .then(setCatalog)
      .catch(() => setError('Run npm run seed to build the local catalog.'))
  }, [])

  useEffect(() => {
    void fetchMe()
      .then((result) => {
        setUser(result.user)
        setAuth(result.auth)
      })
      .catch(() => {
        setUser(null)
        setAuth(false)
      })
  }, [])

  useEffect(() => {
    void fetchOverlay(HK_BBOX)
      .then(setOverlay)
      .catch(() => setOverlay([]))
  }, [])

  useEffect(() => {
    if (
      !shouldLoadRecent({
        onMap: true,
        selected: Boolean(selected),
        siteOpen: Boolean(site),
        featurePath: Boolean(featurePath?.slug),
      })
    ) {
      return
    }
    let cancelled = false
    void fetchRecent()
      .then((items) => {
        if (!cancelled) setRecent(items)
      })
      .catch(() => {
        if (!cancelled) setRecent([])
      })
    return () => {
      cancelled = true
    }
  }, [selected, site, featurePath?.slug])

  useEffect(() => {
    if (!featurePath) {
      setSelected((current) => (current ? null : current))
      setEdges((current) => (current.length ? [] : current))
      historyOpen.current = false
      setAudit((current) => (current === null ? current : null))
      return
    }
    let cancelled = false
    fetchFeatureBySlug(featurePath.slug)
      .then(async (feature) => {
        if (cancelled) return
        if (!feature) {
          const stub = catalog.features.find((item) => item.properties.slug === featurePath.slug)
          setSelected(stub ? catalogFeatureToFeature(stub) : null)
          setEdges([])
          historyOpen.current = false
          setAudit(null)
          return
        }
        setSelected(feature)
        try {
          setEdges(await fetchEdges(feature.id))
        } catch {
          setEdges([])
        }
        historyOpen.current = false
        setAudit(null)
      })
      .catch(() => {
        if (!cancelled) setSelected(null)
      })
    return () => {
      cancelled = true
    }
  }, [featurePath?.slug, catalog])

  const openSite = useCallback(
    async (lng: number, lat: number, bbox: Bbox) => {
      const request = ++siteRequest.current
      bboxRef.current = bbox
      const gisBbox = gisAroundPoint(lng, lat) ?? bbox
      const [features, buildings, lots] = await Promise.all([
        loadNearby(gisBbox, catalog),
        fetchBuildingsInWgsBounds(gisBbox.west, gisBbox.south, gisBbox.east, gisBbox.north).catch(() => []),
        fetchLotsInWgsBounds(gisBbox.west, gisBbox.south, gisBbox.east, gisBbox.north).catch(() => []),
      ])
      if (request !== siteRequest.current) return
      setNearby(features)
      setSite(
        querySite({
          lng,
          lat,
          buildings,
          lots,
          establishments: features.map(featureAsEstablishment),
        }),
      )
    },
    [catalog],
  )

  useEffect(() => {
    selectedRef.current = selected
    if (!selected || selected.lng == null || selected.lat == null) return
    const lng = selected.lng
    const lat = selected.lat
    void openSite(lng, lat, {
      west: lng - 0.003,
      south: lat - 0.003,
      east: lng + 0.003,
      north: lat + 0.003,
    })
  }, [selected, openSite])

  useEffect(() => {
    if (selectedRef.current) return
    const current = siteRef.current
    const bbox = bboxRef.current
    if (current && bbox) void openSite(current.lng, current.lat, bbox)
  }, [openSite])

  function closePanel() {
    bboxRef.current = null
    siteRef.current = null
    setHitId(null)
    setSite(null)
    setSelected(null)
    setEdges([])
    closeHistory()
    go(canonicalPath(locale, '/'))
  }

  function openPoint(lng: number, lat: number, bbox: Bbox, nextHitId: string | null) {
    if (draft) {
      setDraft({ ...draft, lng, lat })
      return
    }
    go(canonicalPath(locale, '/'))
    setHitId(nextHitId)
    setSelected(null)
    setEdges([])
    closeHistory()
    void openSite(lng, lat, bbox)
  }

  function selectSlug(slug: string, kind?: Feature['kind']) {
    const resolved =
      kind
      ?? nearby.find((feature) => feature.slug === slug)?.kind
      ?? catalog.features.find((feature) => feature.properties.slug === slug)?.properties.kind
      ?? 'establishment'
    go(featurePublicPath(locale, resolved, slug))
  }

  function openPhoto(featureId: string) {
    const catalogHit = catalog.features.find((feature) => feature.properties.id === featureId)
    if (catalogHit) {
      selectSlug(catalogHit.properties.slug, catalogHit.properties.kind)
      return
    }
    const known =
      overlay.find((feature) => feature.id === featureId) ?? nearby.find((feature) => feature.id === featureId)
    if (known) selectSlug(known.slug, known.kind)
  }

  const panelFeatures = mergeSelected(nearby, selected)

  return (
    <div className="app">
      <a className="skip-link" href="#site-panel">
        Skip to site panel
      </a>
      <header className="chrome">
        <div className="chrome-brand">
          <h1>{text.title}</h1>
        </div>
        <nav className="lang-switch" aria-label="Language">
          <a
            href={`${switchLocalePath(path, otherLocale)}${search}`}
            hrefLang={otherLocale === 'zh-hk' ? 'zh-Hant' : 'en'}
            lang={otherLocale === 'zh-hk' ? 'zh-Hant' : 'en'}
            onClick={(event) => {
              event.preventDefault()
              go(`${switchLocalePath(path, otherLocale)}${search}`)
            }}
          >
            {text.otherLanguage}
          </a>
          {auth && !user ? (
            <a href={`/api/auth/google?return=${encodeURIComponent(path + search)}`}>{text.signIn}</a>
          ) : null}
          {user ? (
            <span className="atlas-user">
              {user.email}
              <a href={`/api/auth/logout?return=${encodeURIComponent(path + search)}`}>{text.signOut}</a>
            </span>
          ) : null}
        </nav>
      </header>
      <div className="workspace">
          <div className="map-stack">
            <AtlasMap
              catalog={visible}
              selectedId={selected?.id ?? hitId}
              focus={mapFocus}
              buildings={site?.buildings ?? []}
              lots={site?.lots ?? []}
              photos={mapPhotos}
              onPointClick={openPoint}
              onPhotoClick={openPhoto}
              onView={loadMapPhotos}
            />
            <MapRegionChips
              locale={locale}
              region={mapRegion}
              district={mapDistrict}
              onRegion={(slug) => {
                setMapRegion(slug)
                setMapDistrict(null)
              }}
              onDistrict={setMapDistrict}
            />
          </div>
          <aside className="sidebar" id="site-panel">
            {error ? <p className="error">{error}</p> : null}
            {draft ? (
              <FeatureForm
                locale={locale}
                draft={draft}
                creating={creating}
                error={formError}
                onChange={setDraft}
                onCancel={() => {
                  setDraft(null)
                  setCreating(false)
                  setFormError(null)
                }}
                onSave={() => {
                  if (draft.lng == null || draft.lat == null) {
                    setFormError(text.clickMap)
                    return
                  }
                  setFormError(null)
                  void saveFeature(
                    wikiDraftToWrite(draft),
                    creating ? undefined : selected?.slug,
                    creating ? undefined : selected?.updatedAt,
                  )
                    .then((saved) => {
                      setOverlay((current) => [
                        ...current.filter((item) => item.id !== saved.id),
                        saved,
                      ])
                      setDraft(null)
                      setCreating(false)
                      setSelected(saved)
                      go(featurePublicPath(locale, saved.kind, saved.slug))
                      closeHistory()
                    })
                    .catch((err: Error) => setFormError(err.message))
                }}
                onDelete={
                  !creating && selected && wikiCanDelete(selected.id)
                    ? () => {
                        void deleteFeature(selected.slug, selected.updatedAt)
                          .then(() => {
                            setOverlay((current) => current.filter((item) => item.id !== selected.id))
                            setDraft(null)
                            setCreating(false)
                            closePanel()
                          })
                          .catch((err: Error) => setFormError(err.message))
                      }
                    : undefined
                }
              />
            ) : (
              <FeaturePanel
                locale={locale}
                site={site}
                features={panelFeatures}
                selected={selected}
                edges={edges}
                recent={recent}
                onSelectSlug={selectSlug}
                onClose={closePanel}
                onBack={
                  site
                    ? () => {
                        setSelected(null)
                        go(canonicalPath(locale, '/'))
                      }
                    : undefined
                }
                onAdd={
                  user
                    ? () => {
                        setFormError(null)
                        setCreating(true)
                        setDraft(emptyWikiDraft(site?.lng ?? selected?.lng ?? null, site?.lat ?? selected?.lat ?? null))
                      }
                    : undefined
                }
                onEdit={
                  user && selected
                    ? () => {
                        setFormError(null)
                        setCreating(false)
                        setDraft(wikiDraftFromFeature(selected))
                      }
                    : undefined
                }
                audit={audit}
                onShowHistory={selected ? () => loadHistory(selected.id) : undefined}
                photos={
                  selected ? (
                    <PlacePhotos
                      featureId={selected.id}
                      placeName={displayNames(selected, locale).title}
                      canUpload={Boolean(user) && selected.lng != null && selected.lat != null}
                      userSub={user?.sub ?? null}
                      locale={locale}
                      onChange={() => {
                        const view = mapView.current
                        if (view) loadMapPhotos(view.bbox, view.zoom)
                        if (historyOpen.current) loadHistory(selected.id)
                      }}
                    />
                  ) : null
                }
                onRevert={
                  user && selected
                    ? (id) => {
                        void revertAudit(id, selected.updatedAt)
                          .then((result) => {
                            if ('deleted' in result && result.deleted) {
                              setOverlay((current) => current.filter((item) => item.id !== selected.id))
                              closePanel()
                              return
                            }
                            if (!('id' in result)) return
                            setOverlay((current) => [
                              ...current.filter((item) => item.id !== result.id),
                              result,
                            ])
                            setSelected(result)
                            go(featurePublicPath(locale, result.kind, result.slug))
                            loadHistory(result.id)
                          })
                          .catch((err: Error) => setError(err.message))
                      }
                    : undefined
                }
              />
            )}
          </aside>
        </div>
    </div>
  )
}

export default AtlasApp
