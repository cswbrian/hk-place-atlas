import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { fetchSearch } from '../api/features'
import { trackEvent } from '../domain/analytics'
import type { Feature } from '../domain/feature'
import { displayNames, type SiteLocale, copy } from '../domain/locale'
import {
  PLACE_SEARCH_LIMIT,
  fetchAddressSearch,
  type AddressHit,
} from '../domain/locationSearch'
import { Button } from './Button'

const SEARCH_DEBOUNCE_MS = 280

type Props = {
  locale: SiteLocale
  onSelectAddress: (hit: AddressHit) => void
  onSelectPlace: (feature: Feature) => void
}

export function MapSearchBox({ locale, onSelectAddress, onSelectPlace }: Props) {
  const text = copy[locale]
  const [q, setQ] = useState('')
  const [addresses, setAddresses] = useState<AddressHit[]>([])
  const [places, setPlaces] = useState<Feature[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) {
      setLoading(false)
      setAddresses([])
      setPlaces([])
      return
    }

    let cancelled = false
    // Debounce first — do not flip loading on every keystroke (backspace flicker).
    const handle = window.setTimeout(() => {
      if (cancelled) return
      setLoading(true)
      setOpen(true)
      void Promise.all([
        fetchAddressSearch(needle, locale).catch(() => [] as AddressHit[]),
        fetchSearch(needle).catch(() => [] as Feature[]),
      ]).then(([nextAddresses, nextPlaces]) => {
        if (cancelled) return
        const placesSlice = nextPlaces.slice(0, PLACE_SEARCH_LIMIT)
        setAddresses(nextAddresses)
        setPlaces(placesSlice)
        setLoading(false)
        trackEvent('search', {
          search_term: needle,
          place_results: placesSlice.length,
          address_results: nextAddresses.length,
        })
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [q, locale])

  const needle = q.trim()
  const shortQuery = needle.length < 2

  function pickPlace(feature: Feature, method: 'click' | 'enter') {
    trackEvent('map_search_select', {
      section: 'place',
      method,
      search_term: needle,
      place_id: feature.id,
    })
    onSelectPlace(feature)
    setOpen(false)
  }

  function pickAddress(hit: AddressHit, method: 'click' | 'enter') {
    trackEvent('map_search_select', {
      section: 'address',
      method,
      search_term: needle,
    })
    onSelectAddress(hit)
    setOpen(false)
  }

  function onResultPointerDown(event: ReactPointerEvent, action: () => void) {
    event.preventDefault()
    event.stopPropagation()
    action()
  }

  function pickEnter() {
    if (loading || shortQuery) return
    if (places[0]) {
      pickPlace(places[0], 'enter')
      return
    }
    if (addresses[0]) pickAddress(addresses[0], 'enter')
  }

  const showList = open && !shortQuery
  const empty = addresses.length === 0 && places.length === 0

  return (
    <div className="map-search" aria-busy={loading}>
      <label className="sr-only" htmlFor="map-search">
        {text.search}
      </label>
      <div className="map-search-field">
        <input
          id="map-search"
          type="search"
          value={q}
          placeholder={text.searchPlaceholder}
          autoComplete="off"
          onChange={(event) => setQ(event.target.value)}
          onFocus={() => {
            if (needle.length >= 2) setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              pickEnter()
            }
            if (event.key === 'Escape') setOpen(false)
          }}
        />
        {loading ? <span className="map-search-spinner" aria-hidden="true" /> : null}
      </div>
      {showList ? (
        <div className="map-search-hits" role="listbox">
          {loading && empty ? (
            <p className="muted map-search-empty">{text.searching}</p>
          ) : null}
          {!loading && empty ? <p className="muted map-search-empty">{text.noResults}</p> : null}
          {places.length > 0 ? (
            <section className="map-search-section">
              <h3 className="map-search-heading">{text.searchPlaces}</h3>
              <ul>
                {places.map((feature) => {
                  const names = displayNames(feature, locale)
                  return (
                    <li key={feature.id}>
                      <Button
                        onPointerDown={(event) =>
                          onResultPointerDown(event, () => pickPlace(feature, 'click'))
                        }
                      >
                        <span className="map-search-title">{names.title}</span>
                        {names.secondary ? (
                          <span className="muted map-search-meta">{names.secondary}</span>
                        ) : null}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
          {addresses.length > 0 ? (
            <section className="map-search-section">
              <h3 className="map-search-heading">{text.searchAddresses}</h3>
              <ul>
                {addresses.map((hit) => {
                  const meta = [hit.address, hit.district].filter(Boolean).join(' · ')
                  return (
                    <li key={hit.id}>
                      <Button
                        onPointerDown={(event) =>
                          onResultPointerDown(event, () => pickAddress(hit, 'click'))
                        }
                      >
                        <span className="map-search-title">{hit.name}</span>
                        {meta ? <span className="muted map-search-meta">{meta}</span> : null}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
