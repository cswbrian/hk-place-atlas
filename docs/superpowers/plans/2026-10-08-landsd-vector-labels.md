# LandsD Vector Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overlay LandsD Vector Map Label tiles on the existing WGS84 basemap, with language following site locale (`en` → English, `hk` → Traditional Chinese).

**Architecture:** Pure helpers in `basemap.ts` build the label style URL, merge a fetched label style into the resolved basemap style (rename clashing `esri` source to `landsd-labels`, keep basemap sprite, use label glyphs). `AtlasMap` fetches labels for the current locale and merges them in `transformStyle` on initial load and locale change.

**Tech Stack:** MapLibre GL, LandsD Map API v1.0.0, Vitest, React.

---

### Task 1: Label URL + merge helpers (TDD)

**Files:**
- Modify: `src/ui/basemap.ts`
- Modify: `src/ui/basemap.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/ui/basemap.test.ts`:

```ts
import {
  LANDSD_ATTRIBUTION,
  landsDepartmentMapStyle,
  landsdLabelLang,
  landsdLabelStyleUrl,
  mergeLandsDepartmentLabels,
} from './basemap'

it('maps site locale to LandsD label language', () => {
  expect(landsdLabelLang('en')).toBe('en')
  expect(landsdLabelLang('hk')).toBe('tc')
})

it('builds the WGS84 label style URL for a language', () => {
  expect(landsdLabelStyleUrl('tc')).toBe(
    'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/tc/WGS84/resources/styles/root.json',
  )
  expect(landsdLabelStyleUrl('en')).toBe(
    'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/en/WGS84/resources/styles/root.json',
  )
})

it('merges label source/layers without clashing with basemap esri', () => {
  const basemap = landsDepartmentMapStyle(
    {
      glyphs: '../fonts/{fontstack}/{range}.pbf',
      sprite: '../sprites/sprite',
      sources: { esri: { type: 'vector', url: '../../', maxzoom: 19 } },
      layers: [{ id: 'base-fill', type: 'fill', source: 'esri', paint: {} }],
    },
    STYLE_URL,
  )
  const labelUrl =
    'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/tc/WGS84/resources/styles/root.json'
  const labels = landsDepartmentMapStyle(
    {
      glyphs: '../fonts/{fontstack}/{range}.pbf',
      sprite: 'https://example.com/label-sprite',
      sources: { esri: { type: 'vector', url: '../../', maxzoom: 19 } },
      layers: [
        {
          id: 'place-label',
          type: 'symbol',
          source: 'esri',
          layout: { 'text-field': 'name', 'text-font': ['CYanHeiHK Regular'] },
        },
      ],
    },
    labelUrl,
  )
  const merged = mergeLandsDepartmentLabels(basemap, labels, labelUrl)

  expect(merged.sources.esri).toEqual(basemap.sources.esri)
  expect(merged.sources['landsd-labels']).toEqual({
    type: 'vector',
    tiles: [
      'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/tc/WGS84/tile/{z}/{y}/{x}.pbf',
    ],
    maxzoom: 15,
    attribution: '',
  })
  expect(merged.sprite).toBe(basemap.sprite)
  expect(merged.glyphs).toBe(
    'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/tc/WGS84/resources/fonts/{fontstack}/{range}.pbf',
  )
  expect(merged.layers?.map((layer) => layer.id)).toEqual(['base-fill', 'place-label'])
  expect(merged.layers?.[1]).toMatchObject({ source: 'landsd-labels' })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/ui/basemap.test.ts`

- [ ] **Step 3: Implement helpers in `src/ui/basemap.ts`**

```ts
import type { StyleSpecification } from 'maplibre-gl'
import type { SiteLocale } from '../domain/locale'

export const LANDSD_LABEL_SOURCE = 'landsd-labels'

export function landsdLabelLang(locale: SiteLocale): 'en' | 'tc' {
  return locale === 'en' ? 'en' : 'tc'
}

export function landsdLabelStyleUrl(lang: 'en' | 'tc'): string {
  return `https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/${lang}/WGS84/resources/styles/root.json`
}

export function mergeLandsDepartmentLabels(
  basemap: StyleSpecification,
  labels: StyleSpecification,
  labelDocumentUrl: string,
): StyleSpecification {
  const labelSource = labels.sources?.esri
  const sources = { ...basemap.sources }
  if (labelSource && labelSource.type === 'vector') {
    sources[LANDSD_LABEL_SOURCE] = labelSource
  }
  const labelLayers = (labels.layers ?? []).map((layer) =>
    'source' in layer && layer.source === 'esri'
      ? { ...layer, source: LANDSD_LABEL_SOURCE }
      : layer,
  )
  return {
    ...basemap,
    glyphs: labels.glyphs ?? basemap.glyphs,
    sources,
    layers: [...(basemap.layers ?? []), ...labelLayers],
  }
}
```

Note: `labels` should already be passed through `landsDepartmentMapStyle` so glyphs/tiles are absolute; `labelDocumentUrl` is unused if glyphs are already resolved — prefer using `labels.glyphs` after transform. Keep the third arg only if needed for resolve; otherwise omit from API and tests.

Prefer final signature without unused arg:

```ts
export function mergeLandsDepartmentLabels(
  basemap: StyleSpecification,
  labels: StyleSpecification,
): StyleSpecification
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/ui/basemap.test.ts`

---

### Task 2: Wire locale into AtlasMap

**Files:**
- Modify: `src/ui/AtlasMap.tsx`
- Modify: `src/AtlasApp.tsx` (pass `locale` into `AtlasMap`)

- [ ] **Step 1: Pass `locale` from `AtlasApp`**

```tsx
<AtlasMap
  locale={locale}
  catalog={visible}
  ...
/>
```

- [ ] **Step 2: Load / reload merged style in `AtlasMap`**

Add `locale: SiteLocale` to props. Keep a `localeRef`. After creating the map:

```ts
const applyBasemap = async (siteLocale: SiteLocale) => {
  const labelUrl = landsdLabelStyleUrl(landsdLabelLang(siteLocale))
  let labels: StyleSpecification | null = null
  try {
    const response = await fetch(labelUrl)
    if (response.ok) labels = await response.json()
  } catch {
    labels = null
  }
  if (!mapRef.current) return
  mapRef.current.setStyle(LANDSD_STYLE_URL, {
    diff: false,
    transformStyle: (_previous, next) => {
      const basemap = landsDepartmentMapStyle(next)
      if (!labels) return basemap
      return mergeLandsDepartmentLabels(
        basemap,
        landsDepartmentMapStyle(labels, labelUrl),
      )
    },
  })
}
void applyBasemap(locale)
```

In a separate `useEffect` on `[locale]`, call `applyBasemap(locale)` when the map already exists (skip the first mount if the create effect already applied — use a ref or only run locale effect after map is ready).

Simplest pattern: store `applyBasemap` in a ref from the mount effect; locale effect calls it when `locale` changes after mount.

Preserve existing `style.load` overlay logic; it already re-runs when style reloads and re-adds catalog when `esri` exists and `catalog` does not.

---

### Task 3: Verify

- [ ] **Step 1: Run unit tests**

Run: `npx vitest run src/ui/basemap.test.ts`

- [ ] **Step 2: Typecheck / existing AtlasMap tests if any**

Run: `npx vitest run src/ui/`

- [ ] **Step 3: Manual check**

Open `/hk` — Traditional Chinese labels. Switch to `/en` — English labels. Confirm GIS lots/buildings and catalog pins still appear after the style swap.
