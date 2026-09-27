import { useEffect, useRef, useState } from 'react'
import { fetchFeatureBySlug, fetchPlaces } from '../api/features'
import { featureAsEstablishment, type Feature } from '../domain/feature'
import { copy, displayNames, type SiteLocale } from '../domain/locale'
import {
  PLACE_DECADES,
  PLACE_REGIONS,
  placeChipLabel,
  placeFilterGroupLabel,
} from '../domain/placesFilters'
import type { PlacesListItem, PlacesListResponse } from '../domain/placesQuery'
import { EstablishmentDetail } from './EstablishmentDetail'

type Browse = {
  page: number
  letter: string | null
  q: string | null
  region: string | null
  district: string | null
  decade: number | null
}

type Props = {
  locale: SiteLocale
  slug: string | null
  browse: Browse
  onBrowse: (next: Browse) => void
  onSelectSlug: (slug: string | null) => void
  onViewMap: (slug: string, kind: Feature['kind']) => void
}

function yearLabel(item: PlacesListItem): string {
  if (item.startYear == null && item.endYear == null) return '—'
  if (item.startYear == null) return `–${item.endYear}`
  if (item.endYear == null) return `${item.startYear}–`
  return `${item.startYear}–${item.endYear}`
}

export function PlacesDirectory({ locale, slug, browse, onBrowse, onSelectSlug, onViewMap }: Props) {
  const text = copy[locale]
  const [list, setList] = useState<PlacesListResponse | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryToken, setRetryToken] = useState(0)
  const [filter, setFilter] = useState(browse.q ?? '')
  const [selected, setSelected] = useState<Feature | null>(null)
  const [detailMissing, setDetailMissing] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const onBrowseRef = useRef(onBrowse)
  onBrowseRef.current = onBrowse
  const browseRef = useRef(browse)
  browseRef.current = browse

  useEffect(() => {
    setFilter(browse.q ?? '')
  }, [browse.q])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = filter.trim()
      const current = browse.q ?? ''
      if (next === current) return
      const currentBrowse = browseRef.current
      onBrowseRef.current({ ...currentBrowse, q: next || null, page: 1, letter: null })
    }, 200)
    return () => window.clearTimeout(handle)
  }, [filter, browse.q])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setListError(null)
    void fetchPlaces({
      locale,
      page: browse.page,
      letter: browse.letter,
      q: browse.q,
      region: browse.region,
      district: browse.district,
      decade: browse.decade,
    })
      .then((response) => {
        if (cancelled) return
        setList(response)
        setLoading(false)
        if (response.page !== browse.page) {
          onBrowseRef.current({ ...browseRef.current, page: response.page })
        }
      })
      .catch((err: Error) => {
        if (cancelled) return
        setList(null)
        setListError(err.message || 'Could not load places')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locale, browse.page, browse.letter, browse.q, browse.region, browse.district, browse.decade, retryToken])

  useEffect(() => {
    if (!slug) {
      setSelected(null)
      setDetailMissing(false)
      setDetailLoading(false)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailMissing(false)
    void fetchFeatureBySlug(slug)
      .then((feature) => {
        if (cancelled) return
        setSelected(feature)
        setDetailMissing(!feature)
        setDetailLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setSelected(null)
        setDetailMissing(true)
        setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const total = list?.total ?? 0
  const pageSize = list?.pageSize ?? 50
  const page = list?.page ?? browse.page
  const lastPage = Math.max(1, Math.ceil(total / pageSize) || 1)

  return (
    <div className={`places-directory${slug ? ' is-detail' : ''}`}>
      <section className="places-list" aria-label={text.places}>
        <label className="sr-only" htmlFor="places-filter">
          {text.search}
        </label>
        <input
          id="places-filter"
          className="places-filter"
          type="search"
          value={filter}
          placeholder={text.searchPlaceholder}
          autoComplete="off"
          onChange={(event) => setFilter(event.target.value)}
        />
        <div className="places-filters">
          <div className="chips" role="group" aria-label={placeFilterGroupLabel('region', locale)}>
            {PLACE_REGIONS.map((region) => {
              const pressed = browse.region === region.slug
              return (
                <button
                  key={region.slug}
                  type="button"
                  className={`chip${pressed ? ' is-selected' : ''}`}
                  aria-pressed={pressed}
                  onClick={() =>
                    onBrowse({
                      ...browse,
                      region: pressed ? null : region.slug,
                      district: null,
                      page: 1,
                    })
                  }
                >
                  {placeChipLabel(locale, region)}
                </button>
              )
            })}
          </div>
          {browse.region ? (
            <div className="chips" role="group" aria-label={placeFilterGroupLabel('district', locale)}>
              {PLACE_REGIONS.find((region) => region.slug === browse.region)?.districts.map((district) => {
                const pressed = browse.district === district.slug
                return (
                  <button
                    key={district.slug}
                    type="button"
                    className={`chip${pressed ? ' is-selected' : ''}`}
                    aria-pressed={pressed}
                    onClick={() =>
                      onBrowse({
                        ...browse,
                        district: pressed ? null : district.slug,
                        page: 1,
                      })
                    }
                  >
                    {placeChipLabel(locale, district)}
                  </button>
                )
              })}
            </div>
          ) : null}
          <div className="chips" role="group" aria-label={placeFilterGroupLabel('decade', locale)}>
            {PLACE_DECADES.map((decade) => {
              const pressed = browse.decade === decade
              return (
                <button
                  key={decade}
                  type="button"
                  className={`chip${pressed ? ' is-selected' : ''}`}
                  aria-pressed={pressed}
                  onClick={() =>
                    onBrowse({
                      ...browse,
                      decade: pressed ? null : decade,
                      page: 1,
                    })
                  }
                >
                  {placeChipLabel(locale, decade)}
                </button>
              )
            })}
          </div>
        </div>
        {listError ? (
          <p className="error">
            {listError}{' '}
            <button type="button" className="linkish" onClick={() => setRetryToken((n) => n + 1)}>
              Retry
            </button>
          </p>
        ) : null}
        {loading && !list ? <p className="muted">…</p> : null}
        {!loading && list && list.features.length === 0 ? <p className="muted">{text.noResults}</p> : null}
        {list && list.features.length > 0 ? (
          <ol className="catalog catalog-places">
            {list.features.map((item) => {
              const names = displayNames(item, locale)
              return (
                <li key={item.slug} className="catalog-row">
                  <button
                    type="button"
                    className={`linkish catalog-name${slug === item.slug ? ' is-selected' : ''}`}
                    onClick={() => onSelectSlug(item.slug)}
                  >
                    <span className="catalog-name-primary">{names.title}</span>
                    {names.secondary ? (
                      <span className="catalog-name-secondary muted">{names.secondary}</span>
                    ) : null}
                  </button>
                  <span className="catalog-year muted">{yearLabel(item)}</span>
                </li>
              )
            })}
          </ol>
        ) : null}
        {list && total > 0 ? (
          <div className="places-pager">
            <button
              type="button"
              className="ghost"
              disabled={page <= 1}
              onClick={() => onBrowse({ ...browse, page: page - 1 })}
            >
              ←
            </button>
            <span className="muted">
              {page} / {lastPage}
            </span>
            <button
              type="button"
              className="ghost"
              disabled={page >= lastPage}
              onClick={() => onBrowse({ ...browse, page: page + 1 })}
            >
              →
            </button>
          </div>
        ) : null}
      </section>
      <section className="places-detail" id="site-panel">
        {!slug ? <p className="hint">{text.pickPlace}</p> : null}
        {slug && detailLoading ? <p className="muted">…</p> : null}
        {slug && detailMissing && !detailLoading ? <p className="muted">{text.emptySite}</p> : null}
        {selected ? (
          <>
            <EstablishmentDetail
              establishment={featureAsEstablishment(selected)}
              establishments={[featureAsEstablishment(selected)]}
              relations={[]}
              onSelect={() => undefined}
              onBack={() => onSelectSlug(null)}
            />
            <p>
              <button type="button" onClick={() => onViewMap(selected.slug, selected.kind)}>
                {text.viewOnMap}
              </button>
            </p>
          </>
        ) : null}
      </section>
    </div>
  )
}
