# Places region, district, and decade filters

Quick filters on the places directory: a region chip, the districts inside that region, and a decade chip. They narrow the same paginated list as the name search.

## Goal

Someone on `/en/places` or `/zh-hk/places` can limit the directory to one region, optionally one district in that region, and optionally the decade a place was built, without leaving the page.

## Behavior

Chips sit under the search box, before the list. Three rows, each wrapping:

1. **Region.** Hong Kong Island, Kowloon, New Territories. No separate “all” chip. The pressed chip is the current region. Clicking it again clears the region and the district.
2. **District.** Shown only while a region is pressed. Only that region’s districts. Clicking the pressed district clears the district and leaves the region. Choosing a different region clears the district.
3. **Decade.** 1940s through 2020s. Clicking the pressed decade clears it.

Filters combine with each other and with `q`. “Kowloon + 1980s + garden” is one list. Any chip change or search change sets `page` back to 1. `letter` is unchanged: still dropped while `q` is set, still applied on the plain list.

A place with no `start_year` appears only when no decade is selected. A place with no region appears only when no region is selected.

The Places tab still opens a clean `/places` with no query. Closing the detail pane still keeps the query string. The language switch still keeps the query string.

## URLs

New query params, alongside `page`, `letter`, and `q`:

| Param | Example | Meaning |
|---|---|---|
| `region` | `kowloon` | One region slug |
| `district` | `yau-tsim-mong` | One district slug, only valid inside the current region |
| `decade` | `1980` | Built from that year through the next nine years |

Example: `/en/places?region=kowloon&district=yau-tsim-mong&decade=1980&q=garden`.

`placesPublicPath` writes `q`, `letter`, `region`, `district`, `decade`, then `page` (page only when greater than 1). A null filter is omitted. Chip order in each row follows the tables below.

Parsing rules:

- Unknown `region` is ignored.
- `district` is ignored when `region` is missing, or when that district is not in that region. `region=kowloon&district=southern` keeps Kowloon and drops the district, because Southern belongs to Hong Kong Island.
- `decade` must be one of `1940`, `1950`, `1960`, `1970`, `1980`, `1990`, `2000`, `2010`, `2020`. Anything else is ignored.
- `q` does not clear region, district, or decade.

## Labels

Slugs are the URL and the in-app id. The **stored** column is the English string already saved on `body.region` or `body.district`. Chinese labels are the Building Department strings from the source file.

### Regions

| Slug | English chip | Chinese chip | Stored `body.region` |
|---|---|---|---|
| `hong-kong` | Hong Kong Island | 香港島 | Hong Kong |
| `kowloon` | Kowloon | 九龍 | Kowloon |
| `new-territories` | New Territories | 新界 | New Territories |

### Districts

Hong Kong Island (`hong-kong`):

| Slug | English | Chinese | Stored `body.district` |
|---|---|---|---|
| `central-western` | Central & Western | 中西區 | Central & Western |
| `eastern` | Eastern | 東區 | Eastern |
| `southern` | Southern | 南區 | Southern |
| `wan-chai` | Wan Chai | 灣仔 | Wan Chai |

Kowloon (`kowloon`):

| Slug | English | Chinese | Stored `body.district` |
|---|---|---|---|
| `kowloon-city` | Kowloon City | 九龍城 | Kowloon City |
| `kwun-tong` | Kwun Tong | 觀塘 | Kwun Tong |
| `sham-shui-po` | Sham Shui Po | 深水埗 | Sham Shui Po |
| `wong-tai-sin` | Wong Tai Sin | 黃大仙 | Wong Tai Sin |
| `yau-tsim-mong` | Yau Tsim Mong | 油尖旺 | Yau Tsim Mong |

New Territories (`new-territories`):

| Slug | English | Chinese | Stored `body.district` |
|---|---|---|---|
| `islands` | Islands | 離島區 | Islands |
| `kwai-tsing` | Kwai Tsing | 葵青 | Kwai Tsing |
| `north` | North | 北區 | North |
| `sai-kung` | Sai Kung | 西貢 | Sai Kung |
| `sha-tin` | Sha Tin | 沙田 | Sha Tin |
| `tai-po` | Tai Po | 大埔 | Tai Po |
| `tsuen-wan` | Tsuen Wan | 荃灣 | Tsuen Wan |
| `tuen-mun` | Tuen Mun | 屯門 | Tuen Mun |
| `yuen-long` | Yuen Long | 元朗 | Yuen Long |

Two source values do not get chips: `Out Of District`, and the single Kowloon row whose district is `Southern`. They remain in a region total when that region is selected.

Decade chips read `1980s` in English and `1980年代` in Chinese.

Each row is a `role="group"` with an accessible name: Region / District / Decade, and 區域 / 區 / 年代. Each chip is a `button` with `aria-pressed`. The pressed chip uses the existing selected treatment (`is-selected`). No visible row headings. No counts on chips.

## Query

No schema change. Region and district stay inside `body`.

`src/domain/placesFilters.ts` owns the tables above, label lookup, and:

```ts
placesFilterSql(filters: {
  region: string | null
  district: string | null
  decade: number | null
}): { sql: string; binds: (string | number)[] }
```

`region` and `district` here are slugs. The SQL binds the stored English strings, never the slugs.

- Region: `json_extract(body, '$.region') = ?`
- District: `json_extract(body, '$.district') = ?`
- Decade `1980`: `start_year >= 1980 AND start_year < 1990`

Empty filters return an empty `sql`. `GET /api/places` ANDs that fragment into every list query:

- The plain list (with `letter`, when set)
- The FTS id query
- The Han `LIKE` id query

So the `total` and the page both respect the chips when `q` is set. Occupancy kinds only, same as today. Sort is unchanged.

`parsePlacesListQuery` returns `region` and `district` as slugs, and `decade` as the start year (`1980`), or null. `PlacesBrowse`, `placesPublicPath`, `fetchPlaces`, `AtlasApp`, and `PlacesDirectory` carry those same three fields. The debounced search update and the page-clamp update keep them.

## Errors

Same as the directory today. A filter that matches nothing uses the existing “no matches” line. An unknown param is treated as unset.

## Tests

- `parsePlacesListQuery`: valid slugs, unknown region dropped, district dropped when it is outside the region or the region is missing, unknown decade dropped, `q` kept together with region and decade.
- `placesFilterSql`: stored English binds (`Hong Kong`, `Central & Western`), decade range, empty filters.
- `placesPublicPath`: writes the three params and omits them when unset. Existing rules for `q`, `letter`, and `page` stay as they are.
- `fetchPlaces` sends `region`, `district`, and `decade`.

## Out of scope

- Use / building-type chips
- A–Z letter buttons (the `letter` param stays as it is)
- A year slider on Places
- Filtering the map
- Counts on chips
- New columns or indexes for region and district
- An “unknown year” chip
