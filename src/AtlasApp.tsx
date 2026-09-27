import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteFeature,
  fetchAudit,
  fetchEdges,
  fetchFeatureBySlug,
  fetchFeaturesInBbox,
  fetchMe,
  fetchOverlay,
  revertAudit,
  saveFeature,
  type AtlasUser,
  type FeatureEdge,
} from './api/features'
import {
  catalogFeatureToFeature,
  filterCatalogCollection,
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
  parsePlacesPath,
  placesPublicPath,
  switchLocalePath,
  type SiteLocale,
} from './domain/locale'
import { parsePlacesListQuery } from './domain/placesQuery'
import { querySite, type SiteQueryResult } from './domain/querySite'
import { maxYear, MIN_YEAR } from './domain/yearView'
import { trackPageview } from './domain/analytics'
import { AtlasMap } from './ui/AtlasMap'
import { FeatureForm, emptyWikiDraft, wikiDraftFromFeature, wikiDraftToWrite, type WikiDraft } from './ui/FeatureForm'
import { FeaturePanel } from './ui/FeaturePanel'
import { PlacesDirectory } from './ui/PlacesDirectory'
import { YearSlider } from './ui/YearSlider'
import { gisAroundPoint } from './domain/gis'
import { wikiCanDelete } from './domain/wiki'
import { fetchBuildingsInWgsBounds } from './ui/buildings/buildingApi'
import { fetchLotsInWgsBounds } from './ui/lots/lotApi'

const NOW = maxYear()
const EMPTY_CATALOG: CatalogGeojson = { type: 'FeatureCollection', features: [] }
const HK_BBOX = { west: 113.8, south: 22.15, east: 114.45, north: 22.58 }

function canonicalPath(locale: SiteLocale, rest: string): string {
  return rest === '/' ? `/${locale}` : `/${locale}${rest}`
}

function stubNearby(catalog: CatalogGeojson, bbox: Bbox, year: number): Feature[] {
  return filterCatalogCollection(catalog, year, NOW)
    .features.filter((feature) =>
      featureInBbox(feature.geometry.coordinates[0], feature.geometry.coordinates[1], bbox),
    )
    .map(catalogFeatureToFeature)
}

async function loadNearby(bbox: Bbox, year: number, catalog: CatalogGeojson): Promise<Feature[]> {
  try {
    return await fetchFeaturesInBbox(bbox, year)
  } catch {
    return stubNearby(catalog, bbox, year)
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
  const [year, setYear] = useState(NOW)
  const [catalog, setCatalog] = useState<CatalogGeojson>(EMPTY_CATALOG)
  const [site, setSite] = useState<SiteQueryResult | null>(null)
  const [nearby, setNearby] = useState<Feature[]>([])
  const [selected, setSelected] = useState<Feature | null>(null)
  const [hitId, setHitId] = useState<string | null>(null)
  const [edges, setEdges] = useState<FeatureEdge[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<Feature[]>([])
  const [user, setUser] = useState<AtlasUser | null>(null)
  const [auth, setAuth] = useState(false)
  const [draft, setDraft] = useState<WikiDraft | null>(null)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const siteRef = useRef<SiteQueryResult | null>(null)
  const bboxRef = useRef<Bbox | null>(null)
  const selectedRef = useRef<Feature | null>(null)
  const siteRequest = useRef(0)
  siteRef.current = site

  const { locale, rest } = parseLocalePath(path)
  const featurePath = parseFeaturePath(rest)
  const placesPath = parsePlacesPath(rest)
  const placesSlug = placesPath?.slug ?? null
  const onPlaces = placesPath != null
  const browse = parsePlacesListQuery(new URLSearchParams(search), locale)
  const onMap = !onPlaces
  const text = copy[locale]
  const otherLocale: SiteLocale = locale === 'en' ? 'zh-hk' : 'en'
  const visible = useMemo(
    () => filterCatalogCollection(mergeOverlay(catalog, overlay), year, NOW),
    [catalog, overlay, year],
  )

  const go = useCallback((next: string) => {
    window.history.pushState({}, '', next)
    const url = new URL(next, window.location.origin)
    setPath(url.pathname)
    setSearch(url.search)
  }, [])

  const browseDirectory = useCallback(
    (next: {
      page: number
      letter: string | null
      q: string | null
      region: string | null
      district: string | null
      decade: number | null
    }) => {
      go(placesPublicPath(locale, placesSlug, next))
    },
    [go, locale, placesSlug],
  )

  const selectDirectorySlug = useCallback(
    (slug: string | null) => {
      go(placesPublicPath(locale, slug, browse))
    },
    [go, locale, browse.page, browse.letter, browse.q, browse.region, browse.district, browse.decade],
  )

  useEffect(() => {
    const next = canonicalPath(locale, rest)
    const nextWithSearch = `${next}${search}`
    if (`${window.location.pathname}${window.location.search}` !== nextWithSearch) {
      window.history.replaceState({}, '', nextWithSearch)
      setPath(next)
      setSearch(search)
    }
    document.documentElement.lang = locale === 'zh-hk' ? 'zh-Hant-HK' : 'en'
    if (onPlaces) {
      document.title = `${text.places} · ${text.title}`
    } else {
      document.title = selected
        ? `${displayNames(selected, locale).title} · ${text.title}`
        : text.title
    }
  }, [locale, rest, text.title, text.places, selected, onPlaces, search])

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
    if (!onMap) return
    fetch('/catalog.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('missing catalog')
        return response.json() as Promise<CatalogGeojson>
      })
      .then(setCatalog)
      .catch(() => setError('Run npm run seed to build the local catalog.'))
  }, [onMap])

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
    if (!onMap) return
    void fetchOverlay(HK_BBOX, year)
      .then(setOverlay)
      .catch(() => setOverlay([]))
  }, [year, onMap])

  useEffect(() => {
    if (onPlaces || !featurePath) {
      if (!onPlaces && !featurePath) {
        setSelected((current) => (current ? null : current))
        setEdges((current) => (current.length ? [] : current))
        setAudit((current) => (current.length ? [] : current))
      }
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
          setAudit([])
          return
        }
        setSelected(feature)
        try {
          setEdges(await fetchEdges(feature.id))
        } catch {
          setEdges([])
        }
        try {
          setAudit(await fetchAudit(feature.id))
        } catch {
          setAudit([])
        }
      })
      .catch(() => {
        if (!cancelled) setSelected(null)
      })
    return () => {
      cancelled = true
    }
  }, [featurePath?.slug, catalog, onPlaces])

  const openSite = useCallback(
    async (lng: number, lat: number, bbox: Bbox) => {
      const request = ++siteRequest.current
      bboxRef.current = bbox
      const gisBbox = gisAroundPoint(lng, lat) ?? bbox
      const [features, buildings, lots] = await Promise.all([
        loadNearby(gisBbox, year, catalog),
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
    [catalog, year],
  )

  useEffect(() => {
    selectedRef.current = selected
    if (!onMap || !selected || selected.lng == null || selected.lat == null) return
    const lng = selected.lng
    const lat = selected.lat
    void openSite(lng, lat, {
      west: lng - 0.003,
      south: lat - 0.003,
      east: lng + 0.003,
      north: lat + 0.003,
    })
  }, [selected, year, openSite, onMap])

  useEffect(() => {
    if (!onMap || selectedRef.current) return
    const current = siteRef.current
    const bbox = bboxRef.current
    if (current && bbox) void openSite(current.lng, current.lat, bbox)
  }, [year, openSite, onMap])

  function closePanel() {
    bboxRef.current = null
    siteRef.current = null
    setHitId(null)
    setSite(null)
    setSelected(null)
    setEdges([])
    setAudit([])
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
    setAudit([])
    void openSite(lng, lat, bbox)
  }

  function selectSlug(slug: string) {
    const kind =
      nearby.find((feature) => feature.slug === slug)?.kind
      ?? catalog.features.find((feature) => feature.properties.slug === slug)?.properties.kind
      ?? 'establishment'
    go(featurePublicPath(locale, kind, slug))
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
          <nav className="view-switch" aria-label="Views">
            <a
              href={canonicalPath(locale, '/')}
              aria-current={onMap ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault()
                go(canonicalPath(locale, '/'))
              }}
            >
              {text.map}
            </a>
            <a
              href={placesPublicPath(locale)}
              aria-current={onPlaces ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault()
                go(placesPublicPath(locale))
              }}
            >
              {text.places}
            </a>
          </nav>
        </div>
        <nav className="lang-switch" aria-label="Language">
          <a href={`/${locale}${search}`} aria-current="page" onClick={(event) => event.preventDefault()}>
            {text.language}
          </a>
          <a
            href={`${switchLocalePath(path, otherLocale)}${search}`}
            onClick={(event) => {
              event.preventDefault()
              go(`${switchLocalePath(path, otherLocale)}${search}`)
            }}
          >
            {copy[otherLocale].language}
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
      {onPlaces ? (
        <div className="workspace workspace-places">
          <PlacesDirectory
            locale={locale}
            slug={placesSlug}
            browse={{
              page: browse.page,
              letter: browse.letter,
              q: browse.q,
              region: browse.region,
              district: browse.district,
              decade: browse.decade,
            }}
            onBrowse={browseDirectory}
            onSelectSlug={selectDirectorySlug}
            onViewMap={(slug, kind) => go(featurePublicPath(locale, kind, slug))}
          />
        </div>
      ) : (
        <div className="workspace">
          <div className="map-stack">
            <AtlasMap
              catalog={visible}
              selectedId={selected?.id ?? hitId}
              buildings={site?.buildings ?? []}
              lots={site?.lots ?? []}
              onPointClick={openPoint}
            />
            <YearSlider min={MIN_YEAR} max={NOW} value={year} onChange={setYear} />
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
                      void fetchAudit(saved.id).then(setAudit).catch(() => setAudit([]))
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
                            void fetchAudit(result.id).then(setAudit).catch(() => setAudit([]))
                          })
                          .catch((err: Error) => setError(err.message))
                      }
                    : undefined
                }
              />
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

export default AtlasApp
