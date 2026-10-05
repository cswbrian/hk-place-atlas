import { PLACE_REGIONS, placeChipLabel, placeFilterGroupLabel } from '../domain/placesFilters'
import type { SiteLocale } from '../domain/locale'

type Props = {
  locale: SiteLocale
  region: string | null
  district: string | null
  onRegion: (slug: string | null) => void
  onDistrict: (slug: string | null) => void
}

export function MapRegionChips({ locale, region, district, onRegion, onDistrict }: Props) {
  const districts = PLACE_REGIONS.find((item) => item.slug === region)?.districts ?? []
  return (
    <div
      className="map-regions"
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div className="chips" role="group" aria-label={placeFilterGroupLabel('region', locale)}>
        {PLACE_REGIONS.map((item) => {
          const pressed = region === item.slug
          return (
            <button
              key={item.slug}
              type="button"
              className={`chip${pressed ? ' is-selected' : ''}`}
              aria-pressed={pressed}
              onClick={() => onRegion(pressed ? null : item.slug)}
            >
              {placeChipLabel(locale, item)}
            </button>
          )
        })}
      </div>
      {districts.length > 0 ? (
        <div className="chips" role="group" aria-label={placeFilterGroupLabel('district', locale)}>
          {districts.map((item) => {
            const pressed = district === item.slug
            return (
              <button
                key={item.slug}
                type="button"
                className={`chip${pressed ? ' is-selected' : ''}`}
                aria-pressed={pressed}
                onClick={() => onDistrict(pressed ? null : item.slug)}
              >
                {placeChipLabel(locale, item)}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
