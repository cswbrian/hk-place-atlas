# Historical Map Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users toggle one of three LandsD historical map sheets as a MapLibre raster overlay with an opacity slider, served through a Worker tile proxy to CSDI MapServer export.

**Architecture:** Pure domain helpers own the sheet catalog, XYZ→Web Mercator bbox math, and CSDI export URL. The Worker allowlists sheet ids and proxies PNG tiles with cache. `AtlasApp` holds `historyMapId` / opacity; a map-chrome control and `AtlasMap` add/remove the raster layer under GIS/catalog layers.

**Tech Stack:** MapLibre GL, Cloudflare Worker, CSDI ArcGIS MapServer export, Vitest, React.

**Spec:** `docs/superpowers/specs/2026-10-09-historical-map-tiles-design.md`

**Note on CRS:** Spec listed `bboxSR=4326` / `imageSR=4326`. Implement with **EPSG:3857** for both so XYZ tiles georegister correctly under MapLibre (Web Mercator). Bbox helper returns metres, not lon/lat.

---

## File structure

| File | Responsibility |
|---|---|
| `src/domain/historyMap.ts` | Sheet catalog, id guard, tile template, XYZ→3857 bbox, CSDI export URL |
| `src/domain/historyMap.test.ts` | Unit tests for the above |
| `src/api/router.ts` | Parse `/api/history-map/:id/:z/:x/:y.png` |
| `src/api/router.test.ts` | Route parse cases |
| `worker/index.ts` | Handle history-map GET, allowlist, cache, proxy export |
| `src/domain/locale.ts` | EN/HK strings for control + attribution |
| `src/ui/HistoryMapControl.tsx` | Map chrome: toggle, sheet radios, opacity |
| `src/ui/AtlasMap.tsx` | Raster source/layer lifecycle + `beforeId` |
| `src/AtlasApp.tsx` | State + wire control + map props |
| `src/index.css` | Compact control styles near zoom |

---

### Task 1: Domain helpers (TDD)

**Files:**
- Create: `src/domain/historyMap.ts`
- Create: `src/domain/historyMap.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HISTORY_MAP_ID,
  DEFAULT_HISTORY_OPACITY,
  HISTORY_MAP_MAX_Z,
  HISTORY_MAP_MIN_Z,
  HISTORY_MAPS,
  historyMapDatasetId,
  historyMapExportUrl,
  historyMapTileTemplate,
  isHistoryMapId,
  xyzToMercatorBbox,
} from './historyMap'

describe('historyMap', () => {
  it('lists the three v1 sheets with default central-1938', () => {
    expect(HISTORY_MAPS.map((m) => m.id)).toEqual([
      'central-1938',
      'victoria-1889',
      'victoria-1897',
    ])
    expect(DEFAULT_HISTORY_MAP_ID).toBe('central-1938')
    expect(DEFAULT_HISTORY_OPACITY).toBe(0.7)
    expect(historyMapDatasetId('central-1938')).toBe('landsd_rcd_1671592552706_20818')
    expect(historyMapDatasetId('victoria-1889')).toBe('landsd_rcd_1631586233937_28500')
    expect(historyMapDatasetId('victoria-1897')).toBe('landsd_rcd_1637714431413_44900')
  })

  it('guards sheet ids', () => {
    expect(isHistoryMapId('central-1938')).toBe(true)
    expect(isHistoryMapId('kowloon-1947')).toBe(false)
  })

  it('builds the MapLibre tile URL template', () => {
    expect(historyMapTileTemplate('central-1938')).toBe(
      '/api/history-map/central-1938/{z}/{x}/{y}.png',
    )
  })

  it('converts XYZ to Web Mercator bbox (z0 world)', () => {
    const bbox = xyzToMercatorBbox(0, 0, 0)
    expect(bbox.west).toBeCloseTo(-20037508.342789244, 3)
    expect(bbox.south).toBeCloseTo(-20037508.342789244, 3)
    expect(bbox.east).toBeCloseTo(20037508.342789244, 3)
    expect(bbox.north).toBeCloseTo(20037508.342789244, 3)
  })

  it('builds a CSDI export URL in EPSG:3857', () => {
    const url = historyMapExportUrl('landsd_rcd_1671592552706_20818', {
      west: 1,
      south: 2,
      east: 3,
      north: 4,
    })
    expect(url).toContain(
      'https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1671592552706_20818/MapServer/export?',
    )
    expect(url).toContain('bbox=1%2C2%2C3%2C4')
    expect(url).toContain('bboxSR=3857')
    expect(url).toContain('imageSR=3857')
    expect(url).toContain('size=256%2C256')
    expect(url).toContain('format=png32')
    expect(url).toContain('transparent=true')
    expect(url).toContain('f=image')
  })

  it('exposes atlas zoom bounds for the Worker', () => {
    expect(HISTORY_MAP_MIN_Z).toBe(9)
    expect(HISTORY_MAP_MAX_Z).toBe(19)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/historyMap.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/domain/historyMap.ts`**

```ts
export type HistoryMapId = 'central-1938' | 'victoria-1889' | 'victoria-1897'

export type HistoryMapDef = {
  id: HistoryMapId
  datasetId: string
  year: number
}

export type MercatorBbox = {
  west: number
  south: number
  east: number
  north: number
}

export const DEFAULT_HISTORY_MAP_ID: HistoryMapId = 'central-1938'
export const DEFAULT_HISTORY_OPACITY = 0.7
export const HISTORY_MAP_MIN_Z = 9
export const HISTORY_MAP_MAX_Z = 19

export const HISTORY_MAPS: readonly HistoryMapDef[] = [
  { id: 'central-1938', datasetId: 'landsd_rcd_1671592552706_20818', year: 1938 },
  { id: 'victoria-1889', datasetId: 'landsd_rcd_1631586233937_28500', year: 1889 },
  { id: 'victoria-1897', datasetId: 'landsd_rcd_1637714431413_44900', year: 1897 },
] as const

const BY_ID = Object.fromEntries(HISTORY_MAPS.map((m) => [m.id, m])) as Record<
  HistoryMapId,
  HistoryMapDef
>

export function isHistoryMapId(value: string): value is HistoryMapId {
  return value in BY_ID
}

export function historyMapDatasetId(id: HistoryMapId): string {
  return BY_ID[id].datasetId
}

export function historyMapTileTemplate(id: HistoryMapId): string {
  return `/api/history-map/${id}/{z}/{x}/{y}.png`
}

const EARTH_RADIUS = 6378137
const ORIGIN_SHIFT = Math.PI * EARTH_RADIUS

export function xyzToMercatorBbox(z: number, x: number, y: number): MercatorBbox {
  const n = 2 ** z
  const tileSize = (2 * ORIGIN_SHIFT) / n
  const west = -ORIGIN_SHIFT + x * tileSize
  const east = west + tileSize
  const north = ORIGIN_SHIFT - y * tileSize
  const south = north - tileSize
  return { west, south, east, north }
}

export function historyMapExportUrl(datasetId: string, bbox: MercatorBbox): string {
  const params = new URLSearchParams({
    bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
    bboxSR: '3857',
    imageSR: '3857',
    size: '256,256',
    format: 'png32',
    transparent: 'true',
    f: 'image',
  })
  return `https://portal.csdi.gov.hk/server/rest/services/common/${datasetId}/MapServer/export?${params}`
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/domain/historyMap.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/domain/historyMap.ts src/domain/historyMap.test.ts
git commit -m "Add historical map sheet catalog and CSDI tile helpers."
```

---

### Task 2: API route parse (TDD)

**Files:**
- Modify: `src/api/router.ts`
- Modify: `src/api/router.test.ts`

- [ ] **Step 1: Add failing route tests**

Append inside the existing `describe('parseApiRoute')`:

```ts
  it('matches historical map tile paths', () => {
    expect(
      parseApiRoute(new URL('https://x/api/history-map/central-1938/17/104856/57012.png')),
    ).toEqual({
      type: 'historyMap',
      id: 'central-1938',
      z: 17,
      x: 104856,
      y: 57012,
    })
  })

  it('rejects unknown history map ids and bad zoom', () => {
    expect(parseApiRoute(new URL('https://x/api/history-map/kowloon/17/1/1.png'))).toBeNull()
    expect(parseApiRoute(new URL('https://x/api/history-map/central-1938/8/1/1.png'))).toBeNull()
    expect(parseApiRoute(new URL('https://x/api/history-map/central-1938/20/1/1.png'))).toBeNull()
  })
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/api/router.test.ts`

- [ ] **Step 3: Extend router**

In `src/api/router.ts`:

1. Import `HISTORY_MAP_MAX_Z`, `HISTORY_MAP_MIN_Z`, `isHistoryMapId`, type `HistoryMapId` from `../domain/historyMap`.
2. Add to `ApiRoute`: `| { type: 'historyMap'; id: HistoryMapId; z: number; x: number; y: number }`
3. Before `return null` in `parseApiRoute`:

```ts
  const historyMap = /^\/api\/history-map\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(path)
  if (historyMap) {
    const id = historyMap[1]!
    const z = Number(historyMap[2])
    const x = Number(historyMap[3])
    const y = Number(historyMap[4])
    if (!isHistoryMapId(id)) return null
    if (!Number.isInteger(z) || z < HISTORY_MAP_MIN_Z || z > HISTORY_MAP_MAX_Z) return null
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return null
    return { type: 'historyMap', id, z, x, y }
  }
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/api/router.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/api/router.ts src/api/router.test.ts
git commit -m "Route historical map tile requests."
```

---

### Task 3: Worker tile proxy

**Files:**
- Modify: `worker/index.ts`

- [ ] **Step 1: Import helpers** near other domain imports:

```ts
import {
  HISTORY_MAP_MAX_Z,
  historyMapDatasetId,
  historyMapExportUrl,
  xyzToMercatorBbox,
} from '../src/domain/historyMap'
```

(`HISTORY_MAP_MIN_Z` already enforced by router; keep import minimal.)

- [ ] **Step 2: Add handler** near `handleGis`:

```ts
const HISTORY_MAP_CACHE_SECONDS = 86_400

async function handleHistoryMap(
  request: Request,
  route: Extract<ApiRoute, { type: 'historyMap' }>,
  ctx: ExecutionContext,
): Promise<Response> {
  if (route.z < 9 || route.z > HISTORY_MAP_MAX_Z) {
    return json({ error: 'invalid history map tile' }, 404)
  }
  const bbox = xyzToMercatorBbox(route.z, route.x, route.y)
  const upstream = historyMapExportUrl(historyMapDatasetId(route.id), bbox)
  if (!upstream.startsWith('https://portal.csdi.gov.hk/server/rest/services/common/')) {
    return json({ error: 'invalid history map tile' }, 400)
  }
  const cache = caches.default
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' })
  const hit = await cache.match(cacheKey)
  if (hit) return hit
  const upstreamResponse = await fetch(upstream, {
    headers: { 'user-agent': 'hk-atlas/1.0' },
  })
  const contentType = upstreamResponse.headers.get('content-type') ?? ''
  if (!upstreamResponse.ok || !contentType.includes('image')) {
    return json({ error: 'history map upstream failed' }, 502)
  }
  const headers = new Headers()
  headers.set('content-type', contentType)
  headers.set('cache-control', `public, max-age=${HISTORY_MAP_CACHE_SECONDS}`)
  const response = new Response(upstreamResponse.body, { status: 200, headers })
  ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}
```

- [ ] **Step 3: Dispatch** in the main route switch alongside GIS:

```ts
if (route.type === 'historyMap') return handleHistoryMap(request, route, ctx)
```

- [ ] **Step 4: Smoke-check locally** (with `npm run dev` or wrangler):

```bash
curl -sI "http://127.0.0.1:8787/api/history-map/central-1938/17/104856/57012.png" | head
```

Expected: `200` and `content-type: image/png` (or 502 if CSDI briefly fails — retry once).

- [ ] **Step 5: Commit**

```bash
git add worker/index.ts
git commit -m "Proxy historical map tiles from CSDI MapServer export."
```

---

### Task 4: Locale copy

**Files:**
- Modify: `src/domain/locale.ts`

- [ ] **Step 1: Add strings** to both `en` and `hk` `copy` objects:

```ts
// en
historyMap: 'History map',
historyMapOpacity: 'Opacity',
historyMapCentral1938: 'Central 1938',
historyMapVictoria1889: 'Victoria 1889',
historyMapVictoria1897: 'Victoria 1897',
historyMapAttribution: 'Historical map: Lands Department',

// hk
historyMap: '歷史地圖',
historyMapOpacity: '透明度',
historyMapCentral1938: '中環 1938',
historyMapVictoria1889: '維多利亞城 1889',
historyMapVictoria1897: '維多利亞 1897',
historyMapAttribution: '歷史地圖：下載自地政總署',
```

(Match surrounding punctuation style in `hk` block.)

- [ ] **Step 2: Commit**

```bash
git add src/domain/locale.ts
git commit -m "Add locale strings for historical map control."
```

---

### Task 5: History map control UI

**Files:**
- Create: `src/ui/HistoryMapControl.tsx`
- Modify: `src/index.css`
- Modify: `src/AtlasApp.tsx`

- [ ] **Step 1: Create control component**

```tsx
import { copy, type SiteLocale } from '../domain/locale'
import {
  DEFAULT_HISTORY_MAP_ID,
  HISTORY_MAPS,
  type HistoryMapId,
} from '../domain/historyMap'

type Props = {
  locale: SiteLocale
  historyMapId: HistoryMapId | null
  opacity: number
  onToggle: (on: boolean) => void
  onSelect: (id: HistoryMapId) => void
  onOpacity: (value: number) => void
}

export function HistoryMapControl({
  locale,
  historyMapId,
  opacity,
  onToggle,
  onSelect,
  onOpacity,
}: Props) {
  const text = copy[locale]
  const on = historyMapId != null
  const labels: Record<HistoryMapId, string> = {
    'central-1938': text.historyMapCentral1938,
    'victoria-1889': text.historyMapVictoria1889,
    'victoria-1897': text.historyMapVictoria1897,
  }
  return (
    <div className="history-map-control">
      <button
        type="button"
        className={`history-map-toggle${on ? ' is-on' : ''}`}
        aria-pressed={on}
        onClick={() => onToggle(!on)}
      >
        {text.historyMap}
      </button>
      {on ? (
        <div className="history-map-panel">
          <div className="history-map-sheets" role="radiogroup" aria-label={text.historyMap}>
            {HISTORY_MAPS.map((sheet) => (
              <label key={sheet.id} className="history-map-sheet">
                <input
                  type="radio"
                  name="history-map-sheet"
                  checked={historyMapId === sheet.id}
                  onChange={() => onSelect(sheet.id)}
                />
                <span>{labels[sheet.id]}</span>
              </label>
            ))}
          </div>
          <label className="history-map-opacity">
            <span>{text.historyMapOpacity}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(event) => onOpacity(Number(event.target.value))}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export { DEFAULT_HISTORY_MAP_ID }
```

- [ ] **Step 2: CSS** — append to `src/index.css`:

```css
.history-map-control {
  position: absolute;
  top: 10px;
  right: 50px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  max-width: min(220px, calc(100% - 70px));
}

.history-map-toggle {
  margin: 0;
  padding: 6px 10px;
  border: 1px solid var(--border);
  background: var(--panel, #fff);
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.history-map-toggle.is-on {
  background: #111;
  color: #fff;
  border-color: #111;
}

.history-map-panel {
  padding: 8px 10px;
  border: 1px solid var(--border);
  background: var(--panel, #fff);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.history-map-sheets {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-map-sheet {
  display: flex;
  gap: 6px;
  align-items: center;
  cursor: pointer;
}

.history-map-opacity {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-map-opacity input {
  width: 100%;
}
```

Place the control inside `.map-stack` (which should be `position: relative` — add that if missing):

```css
.map-stack {
  position: relative;
}
```

(Only add `position: relative` if `.map-stack` lacks it.)

- [ ] **Step 3: Wire state in `AtlasApp.tsx`**

```ts
import {
  DEFAULT_HISTORY_MAP_ID,
  DEFAULT_HISTORY_OPACITY,
  type HistoryMapId,
} from './domain/historyMap'
import { HistoryMapControl } from './ui/HistoryMapControl'

// inside component:
const [historyMapId, setHistoryMapId] = useState<HistoryMapId | null>(null)
const [historyOpacity, setHistoryOpacity] = useState(DEFAULT_HISTORY_OPACITY)
```

Pass to `AtlasMap`: `historyMapId={historyMapId}` `historyOpacity={historyOpacity}` `historyAttribution={text.historyMapAttribution}`

Render next to the map:

```tsx
<HistoryMapControl
  locale={locale}
  historyMapId={historyMapId}
  opacity={historyOpacity}
  onToggle={(on) => setHistoryMapId(on ? (historyMapId ?? DEFAULT_HISTORY_MAP_ID) : null)}
  onSelect={setHistoryMapId}
  onOpacity={setHistoryOpacity}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/HistoryMapControl.tsx src/index.css src/AtlasApp.tsx src/domain/locale.ts
git commit -m "Add historical map toggle control on the map chrome."
```

---

### Task 6: AtlasMap raster layer

**Files:**
- Modify: `src/ui/AtlasMap.tsx`

- [ ] **Step 1: Extend props**

```ts
import {
  historyMapTileTemplate,
  type HistoryMapId,
} from '../domain/historyMap'

type Props = {
  // ...existing
  historyMapId: HistoryMapId | null
  historyOpacity: number
  historyAttribution: string
}
```

- [ ] **Step 2: Sync layer** — helper inside the component module:

```ts
const HISTORY_SOURCE = 'history-map'
const HISTORY_LAYER = 'history-map-raster'

function historyBeforeId(map: MapLibreMap): string | undefined {
  if (map.getLayer('gis-lots-fill')) return 'gis-lots-fill'
  if (map.getLayer('clusters')) return 'clusters'
  return undefined
}

function syncHistoryMap(
  map: MapLibreMap,
  id: HistoryMapId | null,
  opacity: number,
): void {
  if (!id) {
    if (map.getLayer(HISTORY_LAYER)) map.removeLayer(HISTORY_LAYER)
    if (map.getSource(HISTORY_SOURCE)) map.removeSource(HISTORY_SOURCE)
    return
  }
  const tiles = [historyMapTileTemplate(id)]
  const beforeId = historyBeforeId(map)
  const source = map.getSource(HISTORY_SOURCE) as RasterTileSource | undefined
  if (!source) {
    map.addSource(HISTORY_SOURCE, { type: 'raster', tiles, tileSize: 256 })
    map.addLayer(
      {
        id: HISTORY_LAYER,
        type: 'raster',
        source: HISTORY_SOURCE,
        paint: { 'raster-opacity': opacity },
      },
      beforeId,
    )
    return
  }
  // MapLibre: replace source by remove+add when sheet changes
  const current = (source as { tiles?: string[] }).tiles?.[0]
  if (current !== tiles[0]) {
    if (map.getLayer(HISTORY_LAYER)) map.removeLayer(HISTORY_LAYER)
    map.removeSource(HISTORY_SOURCE)
    map.addSource(HISTORY_SOURCE, { type: 'raster', tiles, tileSize: 256 })
    map.addLayer(
      {
        id: HISTORY_LAYER,
        type: 'raster',
        source: HISTORY_SOURCE,
        paint: { 'raster-opacity': opacity },
      },
      beforeId,
    )
    return
  }
  if (map.getLayer(HISTORY_LAYER)) {
    map.setPaintProperty(HISTORY_LAYER, 'raster-opacity', opacity)
  }
}
```

Call `syncHistoryMap` from:

1. End of `style.load` overlay setup (after GIS/catalog layers added), using refs for current id/opacity.
2. A `useEffect` on `[historyMapId, historyOpacity]` that runs when `mapRef.current` is loaded.

- [ ] **Step 3: Attribution** — when constructing `AttributionControl`, if history is on append ` · ${historyAttribution}` via a ref updated each render, or set custom attribution in the sync effect using `map._controls` — simplest: pass dynamic string into control by removing/re-adding is heavy. Prefer:

Keep base attribution as today. When history is on, also set on the raster source:

```ts
map.addSource(HISTORY_SOURCE, {
  type: 'raster',
  tiles,
  tileSize: 256,
  attribution: historyAttribution,
})
```

MapLibre will merge source attribution into the control.

- [ ] **Step 4: Manual check** — open the app, toggle History map on Central 1938 at default center (Pedder St), confirm overlay + opacity + pins above.

- [ ] **Step 5: Commit**

```bash
git add src/ui/AtlasMap.tsx
git commit -m "Overlay historical map raster under catalog layers."
```

---

### Task 7: Verification

- [ ] **Step 1: Run full unit tests**

Run: `npm test`  
Expected: PASS (including new history + router tests)

- [ ] **Step 2: Run lint if usual**

Run: `npm run lint`

- [ ] **Step 3: Final commit only if stray fixes remain**

---

## Spec coverage checklist

| Spec item | Task |
|---|---|
| Three sheets + defaults | 1 |
| Worker `/api/history-map/...` allowlist + cache | 2, 3 |
| XYZ → export URL | 1, 3 |
| Map chrome toggle + radios + opacity | 5 |
| Raster under GIS/catalog | 6 |
| Locale strings + attribution | 4, 6 |
| No URL persistence / no other sheets | (out of scope — not built) |
