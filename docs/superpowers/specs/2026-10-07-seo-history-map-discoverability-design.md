# SEO: Hong Kong history map discoverability

Make [hkatlas.fyi](https://hkatlas.fyi/en) a plausible Google result for queries like “hong kong history map”, “hong kong history places”, and “hong kong place map”, alongside [Gwulo](https://gwulo.com/map-of-places), [HK Maps](https://www.hkmaps.hk/viewer.html), and [Hong Kong Memory](https://www.hkmemory.hk/en/interactive_map.html).

Technical SEO already exists (SSR meta, sitemap, robots, hreflang, JSON-LD, canonical host). This pass adds keyword-facing copy, an About URL, a default share image, and a Search Console checklist.

## Positioning

**Category:** Spatial History Database / 空間歷史資料庫 — a bilingual, map-first record of Hong Kong places across time (buildings, shops, events), with wiki-style detail pages.

| Site | Role |
|---|---|
| **HK Atlas** | Spatial history database of Hong Kong places on an interactive map |
| Gwulo | Deep old-HK place encyclopedia with map overlays |
| HK Maps | Historical map viewer / overlays by year |
| Hong Kong Memory | Cultural-memory interactive map / archive portal |

Optimize for “history + map + place,” not scanned paper-map overlays. Lead with the spatial-history-database framing in About copy, meta descriptions, JSON-LD, crawler HTML, `llms.txt`, and the OG image line — while keeping brand-first document titles aimed at those search queries.

## Scope

**In**

1. Brand-first home titles and keyword meta (EN + ZH), framed as a spatial history database
2. Richer home crawler HTML + JSON-LD / `llms.txt` updates
3. Keyword-aware feature description fallback when notes are empty
4. `/en/about` and `/zh-hk/about` (UI + SSR SEO + sitemap)
5. Default `og.png` + Open Graph / Twitter image tags
6. README Search Console / post-deploy checklist

**Out**

- Long FAQ, blog, or competitor deep-dives
- Per-place OG images
- Backlink outreach or ads
- Renaming the product away from HK Atlas / 香港地圖集
- Keyword stuffing in every place title

## Home & feature meta

Brand strings in the UI `h1` and `og:site_name` stay `HK Atlas` / `香港地圖集`.

| Locale | Document / `og:title` (home) |
|---|---|
| EN | `HK Atlas — Hong Kong history map of places` |
| ZH | `香港地圖集 — 歷史地圖` |

Home meta description: one sentence that names the category and includes Hong Kong, history, map, and places.

- EN (target): `Spatial history database — an interactive map of Hong Kong’s historical places: buildings, shops, and events over time.`
- ZH (target): `空間歷史資料庫 — 香港歷史地方互動地圖，涵蓋樓宇、店舖與事件。`

Home crawler body (SSR inside `#root`): open with the spatial-history-database framing, then a few bullets (browse places on the map; bilingual; standing and demolished), link to `/about`. Compact, not a marketing wall.

Feature pages keep `{Place} · HK Atlas` / `{地方} · 香港地圖集`. If notes are empty, description falls back to a keyword-aware line, e.g. `{name} — historical place in Hong Kong on HK Atlas` (ZH parallel).

Also update home JSON-LD `description`, `llms.txt` blurb (lead with Spatial History Database / 空間歷史資料庫), and tests that assert the old tagline/title.

Implementation note: keep UI brand (`copy[locale].title`) separate from SEO document title strings so the chrome `h1` stays short while `<title>` can be brand-first + keywords.

## About pages

**Routes:** `/en/about`, `/zh-hk/about`

- Worker `parseSeoPath` recognizes About (like home)
- Sitemap includes both locale About URLs (with hreflang pairs)
- Language switch preserves `/about`

**UI:** Chrome header (brand + language) + scrollable main. No map. “About” link in the header near language. Map remains default at `/en` and `/zh-hk`.

**Content** (EN + ZH in locale copy, short):

1. What it is — HK Atlas is a **spatial history database** (空間歷史資料庫): a bilingual map of Hong Kong places across time
2. What you can do — pan/zoom, open place pages, standing & demolished, contribute when signed in
3. How it differs — structured place records over time (not paper-map overlays; not a full encyclopedia; not an archive portal)
4. Link back to the map

**About SEO**

- Title: `About HK Atlas — Hong Kong history map` / `關於香港地圖集 — 歷史地圖`
- Description restates the spatial-history-database positioning
- JSON-LD `@type: AboutPage`
- Crawler body = the same main content

## Share image

- Static `public/og.png` (~1200×630): bilingual brand + short line (“Spatial History Database” / “空間歷史資料庫”)
- All SSR pages get `og:image`, `twitter:image`, and `twitter:card` = `summary_large_image`
- Absolute URL via `PUBLIC_ORIGIN` (e.g. `https://hkatlas.fyi/og.png`)
- No per-place images in this pass

## Search Console & rollout

Extend README:

1. Domain property `hkatlas.fyi` verified (DNS TXT if needed)
2. Submit `https://hkatlas.fyi/sitemap.xml`
3. URL inspection / request indexing for `/en`, `/zh-hk`, `/en/about`, `/zh-hk/about`
4. Optional one-line note for Bing Webmaster

Post-deploy checks:

1. View-source `/en` shows brand-first keyword title
2. `/en/about` returns real HTML body and appears in sitemap
3. `og:image` present on home and About

Console UI steps are run by the operator; engineering verifies live HTML after deploy.

## Architecture

| Area | Change |
|---|---|
| `src/domain/locale.ts` | SEO title/description strings; About copy; header “About” label |
| `src/domain/seo.ts` | About `SeoPath`; `aboutSeoHead`; richer home crawler; OG image in `injectSeoHead`; sitemap homes include `/about` |
| `worker/index.ts` | Serve About SSR like home |
| `src/AtlasApp.tsx` (+ About view) | Route `/about`, header link, render About |
| `public/og.png` | Default share image |
| `README.md` | Search Console / post-deploy checklist |
| Tests | `seo.test.ts`, locale/routing as needed |

## Success criteria

1. Home `<title>` matches the brand-first strings above (EN + ZH)
2. About, meta, crawler HTML, and `llms.txt` frame the product as a Spatial History Database / 空間歷史資料庫
3. About URLs are indexable, in sitemap, and have SSR content
4. Default OG image tags on home + About
5. README documents Search Console steps; live HTML verified after deploy
