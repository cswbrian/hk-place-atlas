import { useEffect, useState } from 'react'
import { displayNames, type SiteLocale, copy } from '../domain/locale'
import type { Feature } from '../domain/feature'

type Props = {
  locale: SiteLocale
  year?: number
  onSelect: (feature: Feature) => void
  search: (q: string, year?: number) => Promise<Feature[]>
}

export function SearchBox({ locale, year, onSelect, search }: Props) {
  const text = copy[locale]
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Feature[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) {
      setHits([])
      return
    }
    const handle = window.setTimeout(() => {
      void search(needle, year)
        .then((result) => {
          setHits(result)
          setOpen(true)
        })
        .catch(() => setHits([]))
    }, 200)
    return () => window.clearTimeout(handle)
  }, [q, year, search])

  return (
    <div className="atlas-search">
      <label className="sr-only" htmlFor="atlas-search">
        {text.search}
      </label>
      <input
        id="atlas-search"
        type="search"
        value={q}
        placeholder={text.search}
        autoComplete="off"
        onChange={(event) => setQ(event.target.value)}
        onFocus={() => {
          if (hits.length) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && hits[0]) {
            event.preventDefault()
            onSelect(hits[0])
            setOpen(false)
          }
          if (event.key === 'Escape') setOpen(false)
        }}
      />
      {open && q.trim().length >= 2 ? (
        <ul className="atlas-search-hits" role="listbox">
          {hits.length === 0 ? (
            <li className="muted">{text.noResults}</li>
          ) : (
            hits.map((feature) => {
              const names = displayNames(feature, locale)
              return (
                <li key={feature.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(feature)
                      setOpen(false)
                    }}
                  >
                    <span>{names.title}</span>
                    {names.secondary ? <span className="muted">{names.secondary}</span> : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
