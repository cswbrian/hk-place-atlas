# Places Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paginated Places directory (`/en/places`, `/en/places/{slug}`) as a peer of the map, backed by `GET /api/places`.

**Architecture:** History API routing in `AtlasApp` already distinguishes locale + rest path. Add `/places` vs `/place/{slug}` parsing, a D1-backed list query (occupancy kinds only, A–Z / search / page), and a split `PlacesDirectory` view. Map URLs, catalog GeoJSON, and year slider stay as they are.

**Tech Stack:** React SPA, custom History API routing, Cloudflare Worker + D1, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-17-places-directory-design.md](../specs/2026-09-17-places-directory-design.md)

---

## File map

- Create: `src/domain/placesQuery.ts` — parse list params, letter `#`/A–Z, page clamp, list item mapping
- Create: `src/domain/placesQuery.test.ts`
- Create: `src/ui/PlacesDirectory.tsx` — split list + detail
- Modify: `src/domain/locale.ts` — `parsePlacesPath`, `placesPublicPath`, header copy
- Modify: `src/domain/locale.test.ts`
- Modify: `src/domain/feature.ts` — export `OCCUPANCY_KINDS`
- Modify: `src/api/router.ts` + `src/api/router.test.ts` — `GET /api/places`
- Modify: `src/api/features.ts` — `fetchPlaces`, optional year on `fetchSearch`
- Modify: `worker/index.ts` — `handlePlacesList`, SEO branch for directory
- Modify: `src/domain/seo.ts` + `src/domain/seo.test.ts` — `/places` path, canonical, sitemap homes
- Modify: `src/ui/SearchBox.tsx` — optional year (all-years search)
- Modify: `src/AtlasApp.tsx` — tabs, query string, skip catalog on Places
- Modify: `src/index.css` — split directory layout
- Modify: `README.md` — Places view

---

### Task 1: Path parsing

**Files:**
- Modify: `src/domain/locale.ts`
- Test: `src/domain/locale.test.ts`

- [ ] **Step 1: Write the failing tests**

Add copy keys used later (`map`, `places`, `viewOnMap`, `pickPlace`) in this task so UI work does not invent strings.

```ts
describe('parsePlacesPath', () => {
  it('reads the directory and a selected slug, and does not collide with /place/{slug}', () => {
    expect(parsePlacesPath('/places')).toEqual({ slug: null })
    expect(parsePlacesPath('/places/jardine-house-1973')).toEqual({ slug: 'jardine-house-1973' })
    expect(parsePlacesPath('/place/jardine-house-1973')).toBeNull()
    expect(parsePlacesPath('/')).toBeNull()
  })
})

describe('placesPublicPath', () => {
  it('builds directory URLs and omits default browse params', () => {
    expect(placesPublicPath('en')).toBe('/en/places')
    expect(placesPublicPath('zh-hk', 'jardine-house-1973')).toBe('/zh-hk/places/jardine-house-1973')
    expect(placesPublicPath('en', null, { letter: 'J', page: 2 })).toBe('/en/places?letter=J&page=2')
    expect(placesPublicPath('en', 'foo', { page: 1 })).toBe('/en/places/foo')
  })
})
```

Also extend `switchLocalePath` tests: `/en/places/foo` → `/zh-hk/places/foo`. Query string is not part of this helper (AtlasApp appends `location.search`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/locale.test.ts`
Expected: FAIL — `parsePlacesPath` / `placesPublicPath` are not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/domain/locale.ts`:

```ts
export type PlacesPath = { slug: string | null }

export type PlacesBrowse = {
  page?: number
  letter?: string | null
  q?: string | null
}

export function parsePlacesPath(rest: string): PlacesPath | null {
  if (rest === '/places') return { slug: null }
  const match = /^\/places\/([^/]+)$/.exec(rest)
  if (!match) return null
  return { slug: decodeURIComponent(match[1]!) }
}

export function placesPublicPath(
  locale: SiteLocale,
  slug?: string | null,
  browse: PlacesBrowse = {},
): string {
  const base = slug ? `/${locale}/places/${encodeURIComponent(slug)}` : `/${locale}/places`
  const params = new URLSearchParams()
  const q = browse.q?.trim()
  if (q) params.set('q', q)
  if (!q && browse.letter) params.set('letter', browse.letter)
  if (browse.page && browse.page > 1) params.set('page', String(browse.page))
  const query = params.toString()
  return query ? `${base}?${query}` : base
}
```

Add to `copy.en` / `copy['zh-hk']`:

```
map: 'Map' / '地圖'
places: 'Places' / '地點'
viewOnMap: 'View on map' / '在地圖查看'
pickPlace: 'Pick a place' / '選擇地點'
```

Keep `parseFeaturePath` matching only `/place/` and `/event/` (singular).

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/domain/locale.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/locale.ts src/domain/locale.test.ts
git commit -m "feat: parse /places directory paths"
```

---

### Task 2: List query helpers

**Files:**
- Create: `src/domain/placesQuery.ts`
- Create: `src/domain/placesQuery.test.ts`
- Modify: `src/domain/feature.ts` (export `OCCUPANCY_KINDS`)

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  clampPage,
  nameEnLetter,
  parsePlacesListQuery,
  PLACES_PAGE_SIZE,
} from './placesQuery'

describe('nameEnLetter', () => {
  it('uses the first English letter, else #', () => {
    expect(nameEnLetter('Jardine House')).toBe('J')
    expect(nameEnLetter('  admiralty')).toBe('A')
    expect(nameEnLetter('88 Queensway')).toBe('#')
    expect(nameEnLetter('怡和大廈')).toBe('#')
    expect(nameEnLetter('')).toBe('#')
  })
})

describe('parsePlacesListQuery', () => {
  it('defaults page and pageSize, and drops letter while q is set', () => {
    expect(parsePlacesListQuery(new URLSearchParams(), 'en')).toEqual({
      page: 1,
      pageSize: PLACES_PAGE_SIZE,
      letter: null,
      q: null,
      locale: 'en',
    })
    const params = new URLSearchParams('page=2&letter=j&q=house&pageSize=999')
    expect(parsePlacesListQuery(params, 'zh-hk')).toEqual({
      page: 2,
      pageSize: 100,
      letter: null,
      q: 'house',
      locale: 'zh-hk',
    })
  })

  it('accepts A-Z and #, ignores other letters', () => {
    expect(parsePlacesListQuery(new URLSearchParams('letter=#'), 'en').letter).toBe('#')
    expect(parsePlacesListQuery(new URLSearchParams('letter=1'), 'en').letter).toBeNull()
  })
})

describe('clampPage', () => {
  it('clamps past-the-end pages onto the last page', () => {
    expect(clampPage(1, 0, 50)).toBe(1)
    expect(clampPage(9, 120, 50)).toBe(3)
    expect(clampPage(0, 120, 50)).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/placesQuery.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

Export from `src/domain/feature.ts`:

```ts
export const OCCUPANCY_KINDS: FeatureKind[] = ['establishment', 'shop']
```

`src/domain/placesQuery.ts`:

```ts
import type { SiteLocale } from './locale'

export const PLACES_PAGE_SIZE = 50
export const PLACES_PAGE_SIZE_MAX = 100

export type PlacesListQuery = {
  page: number
  pageSize: number
  letter: string | null
  q: string | null
  locale: SiteLocale
}

export type PlacesListItem = {
  slug: string
  kind: 'establishment' | 'shop'
  nameEn: string
  nameZh: string
  status: string
  startYear: number | null
  endYear: number | null
}

export type PlacesListResponse = {
  page: number
  pageSize: number
  total: number
  features: PlacesListItem[]
}

export function nameEnLetter(nameEn: string): string {
  const ch = nameEn.trim().charAt(0).toUpperCase()
  if (ch >= 'A' && ch <= 'Z') return ch
  return '#'
}

export function parsePlacesListQuery(params: URLSearchParams, locale: SiteLocale): PlacesListQuery {
  const page = Math.max(1, Math.trunc(Number(params.get('page')) || 1))
  const rawSize = Math.trunc(Number(params.get('pageSize')) || PLACES_PAGE_SIZE)
  const pageSize = Math.min(PLACES_PAGE_SIZE_MAX, Math.max(1, rawSize))
  const q = params.get('q')?.trim() || null
  const rawLetter = (params.get('letter') ?? '').toUpperCase()
  const letter =
    q ? null : rawLetter === '#' || /^[A-Z]$/.test(rawLetter) ? rawLetter : null
  return { page, pageSize, letter, q, locale: locale === 'zh-hk' ? 'zh-hk' : 'en' }
}

export function clampPage(page: number, total: number, pageSize: number): number {
  if (total <= 0) return 1
  const last = Math.ceil(total / pageSize)
  if (page < 1) return 1
  if (page > last) return last
  return page
}

export function placesOrderSql(locale: SiteLocale): string {
  return locale === 'zh-hk'
    ? 'name_zh COLLATE NOCASE, name_en COLLATE NOCASE, slug'
    : 'name_en COLLATE NOCASE, name_zh COLLATE NOCASE, slug'
}

export function letterSql(letter: string | null): { sql: string; binds: string[] } | null {
  if (!letter) return null
  if (letter === '#') {
    return {
      sql: `UPPER(SUBSTR(TRIM(name_en), 1, 1)) NOT BETWEEN 'A' AND 'Z'`,
      binds: [],
    }
  }
  return {
    sql: `UPPER(SUBSTR(TRIM(name_en), 1, 1)) = ?`,
    binds: [letter],
  }
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/domain/placesQuery.test.ts src/domain/feature.ts`
Expected: PASS (and existing feature tests still pass: `npx vitest run src/domain/feature.test.ts`)

- [ ] **Step 5: Commit**

```bash
git add src/domain/placesQuery.ts src/domain/placesQuery.test.ts src/domain/feature.ts
git commit -m "feat: parse places directory list query"
```

---

### Task 3: API route + client

**Files:**
- Modify: `src/api/router.ts`
- Modify: `src/api/router.test.ts`
- Modify: `src/api/features.ts`

- [ ] **Step 1: Write the failing test**

In `src/api/router.test.ts`:

```ts
it('matches the places directory list', () => {
  expect(parseApiRoute(new URL('https://x/api/places?page=2&letter=J'))).toEqual({
    type: 'places',
  })
})
```

Confirm bbox `GET /api/features` is still `{ type: 'list' }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/router.test.ts`
Expected: FAIL — `/api/places` returns null.

- [ ] **Step 3: Write minimal implementation**

`ApiRoute` union: `| { type: 'places' }`

In `parseApiRoute`, before the unknown-path return:

```ts
if (path === '/api/places') return { type: 'places' }
```

In `src/api/features.ts`:

```ts
import type { PlacesListResponse } from '../domain/placesQuery'
import type { SiteLocale } from '../domain/locale'

export async function fetchPlaces(input: {
  locale: SiteLocale
  page?: number
  letter?: string | null
  q?: string | null
}): Promise<PlacesListResponse> {
  const params = new URLSearchParams({ locale: input.locale })
  if (input.page && input.page > 1) params.set('page', String(input.page))
  if (input.q?.trim()) params.set('q', input.q.trim())
  else if (input.letter) params.set('letter', input.letter)
  const response = await fetch(`/api/places?${params}`)
  if (!response.ok) throw new Error('Could not load places')
  return (await response.json()) as PlacesListResponse
}

export async function fetchSearch(q: string, year?: number, kind?: string): Promise<Feature[]> {
  const params = new URLSearchParams({ q })
  if (year != null && Number.isInteger(year)) params.set('year', String(year))
  if (kind) params.set('kind', kind)
  const response = await fetch(`/api/search?${params}`)
  if (!response.ok) throw new Error('Could not search')
  return (await response.json()) as Feature[]
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/api/router.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/router.ts src/api/router.test.ts src/api/features.ts
git commit -m "feat: add /api/places route and client"
```

---

### Task 4: Worker list handler

**Files:**
- Modify: `worker/index.ts`
- Modify: `src/domain/placesQuery.ts` (row → list item helper, tested)

There is no Worker integration test harness. Keep SQL assembly testable: add `placesListItemFromRow` and occupancy SQL constant in domain; Worker only executes.

- [ ] **Step 1: Write the failing test**

In `src/domain/placesQuery.test.ts`:

```ts
it('maps a D1 row onto a list item', () => {
  expect(
    placesListItemFromRow({
      slug: 'jardine-house-1973',
      kind: 'establishment',
      name_en: 'Jardine House',
      name_zh: '怡和大廈',
      status: 'standing',
      start_year: 1973,
      end_year: null,
    }),
  ).toEqual({
    slug: 'jardine-house-1973',
    kind: 'establishment',
    nameEn: 'Jardine House',
    nameZh: '怡和大廈',
    status: 'standing',
    startYear: 1973,
    endYear: null,
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/placesQuery.test.ts`
Expected: FAIL — `placesListItemFromRow` missing.

- [ ] **Step 3: Implement mapper + Worker handler**

```ts
export const OCCUPANCY_SQL = `kind IN ('establishment','shop')`

export function placesListItemFromRow(row: {
  slug: string
  kind: string
  name_en: string
  name_zh: string
  status: string
  start_year: number | null
  end_year: number | null
}): PlacesListItem {
  return {
    slug: row.slug,
    kind: row.kind === 'shop' ? 'shop' : 'establishment',
    nameEn: row.name_en,
    nameZh: row.name_zh,
    status: row.status,
    startYear: row.start_year,
    endYear: row.end_year,
  }
}
```

In `worker/index.ts`, add `handlePlacesList` (mirror `handleSearch` style):

1. `parsePlacesListQuery(url.searchParams, url.searchParams.get('locale') === 'zh-hk' ? 'zh-hk' : 'en')`
2. If `q`:
   - `fts5Query` / `hanNeedle` as in `handleSearch`
   - Join FTS / LIKE with `AND ${OCCUPANCY_SQL}`
   - Fetch ids with `mergeSearchIds(..., Number.POSITIVE_INFINITY)` — change `mergeSearchIds` cap default only at the call site; pass a large cap (e.g. `100_000`) so directory search is not stuck at 20
   - `total = ids.length`, `page = clampPage(...)`, slice ids, `SELECT` those rows
   - If neither fts nor han, return `{ page: 1, pageSize, total: 0, features: [] }`
3. Else:
   - `WHERE ${OCCUPANCY_SQL}` plus optional `letterSql`
   - `SELECT COUNT(*)` then `clampPage`
   - `SELECT slug, kind, name_en, name_zh, status, start_year, end_year FROM features WHERE ... ORDER BY ${placesOrderSql(locale)} LIMIT ? OFFSET ?`
4. Return `json({ page, pageSize, total, features: rows.map(placesListItemFromRow) })`

Wire next to other GET routes:

```ts
if (route.type === 'places' && request.method === 'GET') return handlePlacesList(request, env)
```

Do not apply a year filter.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/domain/placesQuery.test.ts src/domain/search.test.ts src/api/router.test.ts`
Expected: PASS

Manual check after `npm run dev` (later task): `curl 'http://127.0.0.1:8787/api/places?locale=en&letter=J&page=1'` returns `features` of length ≤ 50 and a `total`.

- [ ] **Step 5: Commit**

```bash
git add src/domain/placesQuery.ts src/domain/placesQuery.test.ts worker/index.ts src/domain/search.ts
git commit -m "feat: serve paginated GET /api/places from D1"
```

---

### Task 5: SEO

**Files:**
- Modify: `src/domain/seo.ts`
- Modify: `src/domain/seo.test.ts`
- Modify: `worker/index.ts` (`handleSeoPage`)

- [ ] **Step 1: Write the failing tests**

```ts
it('reads the places directory and treats a selected slug as UI state', () => {
  expect(parseSeoPath('/en/places')).toEqual({ type: 'places', locale: 'en', slug: null })
  expect(parseSeoPath('/zh-hk/places/high-house-1981')).toEqual({
    type: 'places',
    locale: 'zh-hk',
    slug: 'high-house-1981',
  })
  expect(parseSeoPath('/en/place/high-house-1981')?.type).toBe('feature')
})

it('indexes /places and canonicalizes /places/{slug} to the map URL', () => {
  const dir = placesSeoHead('https://hkatlas.fyi', 'en')
  expect(dir.canonical).toBe('https://hkatlas.fyi/en/places')
  expect(dir.robots).toBe('index,follow')
  expect(dir.title).toContain('Places')

  const selected = placesSeoHead('https://hkatlas.fyi', 'en', stub)
  expect(selected.canonical).toBe('https://hkatlas.fyi/en/place/high-house-1981')
  expect(selected.title).toBe('HIGH HOUSE · HK Atlas')
})

it('adds directory homes to the sitemap and never /places/{slug}', () => {
  const xml = sitemapXml('https://hkatlas.fyi', [{ kind: 'shop', slug: 'cafe-1990' }])
  expect(xml).toContain('<loc>https://hkatlas.fyi/en/places</loc>')
  expect(xml).toContain('<loc>https://hkatlas.fyi/zh-hk/places</loc>')
  expect(xml).not.toContain('/places/cafe-1990')
})
```

Extend `llmsTxt` test (if present) to mention `/en/places`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/seo.test.ts`
Expected: FAIL — `/en/places` currently null from `parseSeoPath`.

- [ ] **Step 3: Write minimal implementation**

`SeoPath`:

```ts
export type SeoPlaces = { type: 'places'; locale: SiteLocale; slug: string | null }
export type SeoPath = SeoHome | SeoFeature | SeoPlaces
```

`parseSeoPath`: after `rest === '/'`, call `parsePlacesPath(rest)` before `parseFeaturePath`.

`placesSeoHead(origin, locale, feature?: Feature)`:

- No feature (directory): title `${copy[locale].places} · ${copy[locale].title}`, description tagline, canonical `${origin}/${locale}/places`, alternates rest `/places`, index,follow, jsonLd website, crawler body with h1 Places + tagline
- With feature: same as `featureSeoHead` except `canonical` stays `featurePublicPath` (map URL) and alternates stay `/place/{slug}` (not `/places/{slug}`)

`sitemapXml`: when `includeHomes`, `pushPair('')` then `pushPair('/places')`.

`llmsTxt`: add `- Places directory: ${base}/en/places and ${base}/zh-hk/places`.

`handleSeoPage`:

```ts
if (seo.type === 'home') return html(injectSeoHead(shell, homeSeoHead(origin, seo.locale), measurementId))
if (seo.type === 'places') {
  if (!seo.slug) return html(injectSeoHead(shell, placesSeoHead(origin, seo.locale), measurementId))
  const row = await env.DB.prepare('SELECT * FROM features WHERE slug = ?').bind(seo.slug).first<FeatureRow>()
  if (!row) return html(injectSeoHead(shell, notFoundSeoHead(origin, seo.locale), measurementId), 404)
  return html(injectSeoHead(shell, placesSeoHead(origin, seo.locale, featureRowToFeature(row)), measurementId))
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/domain/seo.test.ts`
Expected: PASS. Existing home/feature cases still pass. Sitemap still includes `/en/place/cafe-1990`.

- [ ] **Step 5: Commit**

```bash
git add src/domain/seo.ts src/domain/seo.test.ts worker/index.ts
git commit -m "feat: SEO for /places directory URLs"
```

---

### Task 6: SearchBox all-years

**Files:**
- Modify: `src/ui/SearchBox.tsx`

Header search on Places must not send `year`. `fetchSearch` already omits it when `year` is undefined (`worker` only year-filters if `Number.isInteger(year)`).

- [ ] **Step 1: Make `year` optional**

```ts
type Props = {
  locale: SiteLocale
  year?: number
  onSelect: (feature: Feature) => void
  search: (q: string, year?: number) => Promise<Feature[]>
}
```

Pass `year` through to `search(needle, year)` as-is.

No dedicated SearchBox test file exists. Do not add a React renderer unless already in the project. Coverage is AtlasApp wiring + `fetchSearch` signature.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --pretty false`
Expected: PASS after AtlasApp is updated in Task 8; if you typecheck now, AtlasApp still compiles because it passes `year`.

- [ ] **Step 3: Commit**

```bash
git add src/ui/SearchBox.tsx src/api/features.ts
git commit -m "feat: allow header search without a year filter"
```

---

### Task 7: PlacesDirectory UI

**Files:**
- Create: `src/ui/PlacesDirectory.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Component**

Props:

```ts
type Props = {
  locale: SiteLocale
  slug: string | null
  browse: { page: number; letter: string | null; q: string | null }
  onBrowse: (next: { page: number; letter: string | null; q: string | null }) => void
  onSelectSlug: (slug: string | null) => void
  onViewMap: (slug: string, kind: Feature['kind']) => void
}
```

Behavior:

- `useEffect` loads `fetchPlaces({ locale, page: browse.page, letter: browse.letter, q: browse.q })`
- On success, if `clampPage` would change page, call `onBrowse` with the clamped page (Worker also clamps; still trust `response.page`)
- Filter input: local state, debounce 200ms, then `onBrowse({ q, page: 1, letter: null })`
- Letter buttons `A–Z` plus `#`; active letter from `browse.letter`; disabled (or `aria-disabled`) while `browse.q` is set; click sets `{ letter, page: 1, q: null }`
- Rows: button showing `displayNames(item, locale).title` and years (`startYear`–`endYear` or `startYear–`). Selected when `item.slug === slug`. Click → `onSelectSlug(item.slug)`
- Pager: prev/next; show current page and last page (`Math.ceil(total / pageSize)`). Changing page keeps letter/q
- Error: `<p className="error">` + retry button that re-runs the fetch
- Empty: `copy[locale].noResults`
- Right pane: if no slug, `copy[locale].pickPlace`. If slug, `fetchFeatureBySlug`; not found → emptySite copy; else `EstablishmentDetail` with `establishments={[featureAsEstablishment(feature)]}`, `onBack` → `onSelectSlug(null)`, plus a button `copy[locale].viewOnMap` → `onViewMap(feature.slug, feature.kind)`
- Mobile: `.places-directory` stacks; when `slug` is set, hide the list (CSS `.places-directory.is-detail .places-list { display: none }` under the existing 800px breakpoint)

Markup sketch:

```tsx
<div className={`places-directory${slug ? ' is-detail' : ''}`}>
  <section className="places-list" aria-label={text.places}>
    {/* q input, letter nav, ol.catalog.catalog-places, pager */}
  </section>
  <section className="places-detail" id="site-panel">
    {/* empty / not found / EstablishmentDetail + view on map */}
  </section>
</div>
```

- [ ] **Step 2: CSS**

In `src/index.css`:

```css
.chrome-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}
.view-switch { display: flex; gap: 12px; font: 400 12px/1.2 var(--ui); }
.view-switch a[aria-current='page'] { text-decoration: underline; }
.workspace.workspace-places {
  grid-template-columns: minmax(0, 1fr) minmax(280px, 42%);
}
.places-directory {
  display: contents;
}
.places-list, .places-detail {
  min-height: 0;
  overflow: auto;
  padding: 16px 24px 24px;
}
.places-detail { border-left: 1px solid var(--border); }
.places-letters { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0 16px; }
.places-letters button { padding: 2px 6px; font-size: 12px; }
.places-letters button.is-active { background: var(--foreground); color: var(--background); }
```

Under `@media (max-width: 800px)`: `.workspace.workspace-places { grid-template-columns: 1fr; }` and `.places-directory.is-detail .places-list { display: none; }`.

Reuse existing `.catalog` / `.catalog-row` / `.catalog-year`.

- [ ] **Step 3: Commit**

```bash
git add src/ui/PlacesDirectory.tsx src/index.css
git commit -m "feat: Places directory split view"
```

---

### Task 8: Wire AtlasApp

**Files:**
- Modify: `src/AtlasApp.tsx`
- Modify: `README.md`

- [ ] **Step 1: Track query string**

Today `path` is pathname only. Browse state needs search.

```ts
const [path, setPath] = useState(() => window.location.pathname)
const [search, setSearch] = useState(() => window.location.search)

const go = useCallback((next: string) => {
  window.history.pushState({}, '', next)
  const url = new URL(next, window.location.origin)
  setPath(url.pathname)
  setSearch(url.search)
}, [])

useEffect(() => {
  const onPop = () => {
    setPath(window.location.pathname)
    setSearch(window.location.search)
  }
  window.addEventListener('popstate', onPop)
  return () => window.removeEventListener('popstate', onPop)
}, [])
```

`canonicalPath` replaceState must keep `search` (`pathname + search`).

Lang switch: `go(switchLocalePath(path, otherLocale) + search)`.

- [ ] **Step 2: Branch the workspace**

```ts
const placesPath = parsePlacesPath(rest)
const browse = parsePlacesListQuery(new URLSearchParams(search), locale)
const onMap = !placesPath
```

Skip catalog + overlay fetches while `placesPath` is set (load them when `onMap` becomes true). Feature-by-slug effect for the map panel should also skip when `placesPath` is set (directory loads its own detail).

Header:

- Wrap title + tabs in `.chrome-brand`
- Tabs: Map `href={canonicalPath(locale, '/')}` `aria-current={onMap ? 'page' : undefined}`; Places `href={placesPublicPath(locale)}` `aria-current={placesPath ? 'page' : undefined}`. `preventDefault` + `go(...)`. Map tab → `/${locale}` (drop slug). Places tab → `/${locale}/places` (drop slug and browse query)
- `SearchBox` `year={placesPath ? undefined : year}` `search={runSearch}` where `runSearch` is `(q, nextYear) => fetchSearch(q, nextYear)`
- `onSelect`: if `placesPath`, `go(placesPublicPath(locale, feature.slug, browse))`; else existing `featurePublicPath`

Workspace: if `placesPath`, render `<div className="workspace workspace-places">` + `PlacesDirectory`. Else existing map + sidebar.

`PlacesDirectory` callbacks:

```ts
onBrowse={(next) => go(placesPublicPath(locale, placesPath.slug, next))}
onSelectSlug={(slug) => go(placesPublicPath(locale, slug, browse))}
onViewMap={(slug, kind) => go(featurePublicPath(locale, kind, slug))}
```

Skip link: when on Places, `href="#site-panel"` still works (detail pane id).

Document title: if `placesPath` and no selected map feature, use `${text.places} · ${text.title}`.

- [ ] **Step 3: README**

Under Use, add: open `/en/places` for the directory; Map | Places in the header.

- [ ] **Step 4: Tests + typecheck**

Run: `npx vitest run && npx tsc -b --pretty false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/AtlasApp.tsx README.md
git commit -m "feat: Map and Places as peer views"
```

---

### Task 9: Browser verification

- [ ] **Step 1: Run the app**

`npm run dev` (Vite 5173 + Worker 8787). Seed must already exist (`npm run seed`).

- [ ] **Step 2: Exercise the flow**

1. `/en` still map + year slider
2. Header Places → `/en/places`, no map, split list
3. Letter J, page 2 → query string updates; refresh keeps state
4. Click a row → `/en/places/{slug}`, detail on the right, list stays
5. View on map → `/en/place/{slug}`, map + sidebar
6. Header search on Places (no year) → stays on `/en/places/{slug}`
7. Header search on Map → `/en/place/{slug}`
8. Lang switch on `/en/places?letter=J` → `/zh-hk/places?letter=J`
9. Unknown slug: list OK, not-found detail
10. Mobile viewport 390px: list; after select, detail + back
11. Events do not appear (spot-check a known event if any, or `kind` in API JSON)

- [ ] **Step 3: Fix anything broken, re-run `npx vitest run`**

- [ ] **Step 4: Commit only if verification required extra fixes**

---

## Spec coverage

| Spec | Task |
|------|------|
| `/places` vs `/place/{slug}` | 1, 8 |
| Header Map \| Places tabs, tabs drop slug | 8 |
| Split desktop / stacked mobile | 7 |
| All years, no slider on Places | 8 |
| A–Z + `#`, inactive while `q` | 2, 7 |
| 50 per page, clamp | 2, 4 |
| Occupancy kinds only | 2, 4 |
| Header search all-years on Places | 3, 6, 8 |
| List filter `q` paginated | 4, 7 |
| Detail `GET /api/features/:slug` + View on map | 7, 8 |
| Do not load catalog on Places | 8 |
| SEO directory + canonical map URL | 5 |
| Sitemap `/places` not `/places/{slug}` | 5 |
| Errors / empty / unknown slug | 7 |

## Out of scope (do not implement)

Events directory, year filter on the list, PMTiles, changing map clustering, loading `catalog.geojson` for this view.
