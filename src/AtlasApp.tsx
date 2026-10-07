import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  defaultPlaceRedirect,
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
import { AboutPage } from './ui/AboutPage'
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
import { SignInPrompt } from './ui/SignInPrompt'
import {
  parseAuthIntent,
  stripAuthIntent,
  withAuthIntent,
  type AuthIntent,
  type SignInPromptIntent,
} from './domain/authIntent'

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
  const [pinForm, setPinForm] = useState(false)
  const [signInIntent, setSignInIntent] = useState<SignInPromptIntent | null>(null)
  const [photoRequestPick, setPhotoRequestPick] = useState(false)
  const pinCommit = useRef<((featureId: string) => Promise<void>) | null>(null)
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

  const signInHrefFor = useCallback(
    (intent?: SignInPromptIntent) => {
      const target =
        intent && intent !== 'contribute' ? withAuthIntent(path + search, intent) : path + search
      return `/api/auth/google?return=${encodeURIComponent(target)}`
    },
    [path, search],
  )

  const startAdd = useCallback(() => {
    setFormError(null)
    setCreating(true)
    setDraft(emptyWikiDraft(site?.lng ?? selected?.lng ?? null, site?.lat ?? selected?.lat ?? null))
  }, [site, selected])

  const startEdit = useCallback((feature: Feature) => {
    setFormError(null)
    setCreating(false)
    setDraft(wikiDraftFromFeature(feature))
  }, [])

  const requireUser = useCallback(
    (intent: AuthIntent, action: () => void) => {
      if (user) action()
      else setSignInIntent(intent)
    },
    [user],
  )

  useEffect(() => {
    const intent = parseAuthIntent(search)
    if (!user || !intent) return
    if ((intent === 'edit' || intent === 'photo') && !selected) return

    const nextSearch = stripAuthIntent(search)
    setSearch(nextSearch)
    window.history.replaceState({}, '', `${path}${nextSearch}`)

    if (intent === 'add') startAdd()
    else if (intent === 'edit' && selected) startEdit(selected)
    else if (intent === 'photo') setPhotoRequestPick(true)
  }, [user, selected, search, path, startAdd, startEdit])

  const openedDefaultPlace = useRef(false)
  useEffect(() => {
    const redirected = placesPageRedirect(path)
    if (redirected) {
      window.history.replaceState({}, '', redirected)
      setPath(redirected)
      setSearch('')
      return
    }
    if (!openedDefaultPlace.current) {
      const place = defaultPlaceRedirect(path)
      if (place) {
        window.history.replaceState({}, '', `${place}${search}`)
        setPath(place)
        return
      }
      openedDefaultPlace.current = true
    }
    const next = canonicalPath(locale, rest)
    const nextWithSearch = `${next}${search}`
    if (`${window.location.pathname}${window.location.search}` !== nextWithSearch) {
      window.history.replaceState({}, '', nextWithSearch)
      setPath(next)
      setSearch(search)
    }
    document.documentElement.lang = locale === 'zh-hk' ? 'zh-Hant-HK' : 'en'
    document.title =
      rest === '/about'
        ? text.aboutSeoTitle
        : selected
          ? `${displayNames(selected, locale).title} · ${text.title}`
          : text.title
  }, [path, locale, rest, text.title, text.aboutSeoTitle, selected, search])

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
      {rest === '/about' ? (
        <a className="skip-link" href="#about-page">
          Skip to content
        </a>
      ) : (
        <a className="skip-link" href="#site-panel">
          Skip to site panel
        </a>
      )}
      <header className="chrome">
        <div className="chrome-brand">
          <h1>{text.title}</h1>
          <a
            href={`/${locale}/about`}
            className="chrome-about"
            aria-current={rest === '/about' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              go(`/${locale}/about`)
            }}
          >
            {text.aboutNav}
          </a>
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
            <button type="button" className="linkish" onClick={() => setSignInIntent('contribute')}>
              {text.signIn}
            </button>
          ) : null}
          {user ? (
            <span className="atlas-user">
              {user.email}
              <a href={`/api/auth/logout?return=${encodeURIComponent(path + search)}`}>{text.signOut}</a>
            </span>
          ) : null}
        </nav>
      </header>
      {rest === '/about' ? (
        <AboutPage locale={locale} onBack={() => go(`/${locale}`)} />
      ) : (
        <>
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
              {draft && !pinForm ? (
                <FeatureForm
                  locale={locale}
                  draft={draft}
                  creating={creating}
                  error={formError}
                  onChange={setDraft}
                  onCancel={() => {
                    pinCommit.current = null
                    setPinForm(false)
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
                      .then(async (saved) => {
                        setOverlay((current) => [
                          ...current.filter((item) => item.id !== saved.id),
                          saved,
                        ])
                        const commit = pinCommit.current
                        pinCommit.current = null
                        setPinForm(false)
                        setDraft(null)
                        setCreating(false)
                        if (commit) {
                          await commit(saved.id)
                          return
                        }
                        setSelected(saved)
                        go(featurePublicPath(locale, saved.kind, saved.slug))
                        closeHistory()
                      })
                      .catch((err: Error) => setFormError(err.message))
                  }}
                  onDelete={
                    !creating && selected && wikiCanDelete(selected.id)
                      ? () => {
                          if (!window.confirm(text.deletePlaceConfirm)) return
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
                  onBack={
                    site
                      ? () => {
                          setSelected(null)
                          go(canonicalPath(locale, '/'))
                        }
                      : undefined
                  }
                  onAdd={auth ? () => requireUser('add', startAdd) : undefined}
                  onEdit={
                    auth && selected ? () => requireUser('edit', () => startEdit(selected)) : undefined
                  }
                  audit={user ? audit : null}
                  onShowHistory={
                    user && selected ? () => loadHistory(selected.id) : undefined
                  }
                  photos={
                    selected ? (
                      <PlacePhotos
                        featureId={selected.id}
                        placeName={displayNames(selected, locale).title}
                        canUpload={selected.lng != null && selected.lat != null}
                        userSub={user?.sub ?? null}
                        locale={locale}
                        signInHref={signInHrefFor('photo')}
                        onNeedSignIn={() => setSignInIntent('photo')}
                        requestPick={photoRequestPick}
                        onRequestPickConsumed={() => setPhotoRequestPick(false)}
                        onOpenPlace={selectSlug}
                        onCreatePlace={(request) => {
                          pinCommit.current = request.commit
                          setFormError(null)
                          setCreating(true)
                          setPinForm(true)
                          setDraft({ ...emptyWikiDraft(request.lng, request.lat), nameEn: request.nameEn })
                        }}
                        onChange={() => {
                          const view = mapView.current
                          if (view) loadMapPhotos(view.bbox, view.zoom)
                          if (historyOpen.current) loadHistory(selected.id)
                        }}
                      />
                    ) : site ? (
                      <PlacePhotos
                        featureIds={site.establishmentIds}
                        placeName={text.thisSite}
                        canUpload={false}
                        userSub={user?.sub ?? null}
                        locale={locale}
                        signInHref={signInHrefFor('photo')}
                        onOpenPlace={selectSlug}
                        onCreatePlace={(request) => {
                          pinCommit.current = request.commit
                          setFormError(null)
                          setCreating(true)
                          setPinForm(true)
                          setDraft({ ...emptyWikiDraft(request.lng, request.lat), nameEn: request.nameEn })
                        }}
                        onChange={() => {
                          const view = mapView.current
                          if (view) loadMapPhotos(view.bbox, view.zoom)
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
          {draft && pinForm
            ? createPortal(
                <div className="lightbox-form">
                  <FeatureForm
                    locale={locale}
                    draft={draft}
                    creating={creating}
                    error={formError}
                    onChange={setDraft}
                    onCancel={() => {
                      pinCommit.current = null
                      setPinForm(false)
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
                      void saveFeature(wikiDraftToWrite(draft), undefined, undefined)
                        .then(async (saved) => {
                          setOverlay((current) => [...current.filter((item) => item.id !== saved.id), saved])
                          const commit = pinCommit.current
                          pinCommit.current = null
                          setPinForm(false)
                          setDraft(null)
                          setCreating(false)
                          if (commit) await commit(saved.id)
                        })
                        .catch((err: Error) => setFormError(err.message))
                    }}
                  />
                </div>,
                document.body,
              )
            : null}
        </>
      )}
      {signInIntent
        ? createPortal(
            <SignInPrompt
              locale={locale}
              intent={signInIntent}
              signInHref={signInHrefFor(signInIntent)}
              onClose={() => setSignInIntent(null)}
            />,
            document.body,
          )
        : null}
    </div>
  )
}

export default AtlasApp
