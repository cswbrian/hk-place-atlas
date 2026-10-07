# HK Place Atlas

Bilingual public map of Hong Kong buildings, shops, and events.

Live: [https://hkatlas.fyi/en](https://hkatlas.fyi/en) or `/zh-hk`.

Living spec: [docs/superpowers/specs/2026-09-16-hk-scale-cloud-atlas.md](docs/superpowers/specs/2026-09-16-hk-scale-cloud-atlas.md)

## Use

Node 22+ (`node:sqlite` for the seed).

```bash
npm install
npx wrangler d1 migrations apply hk-atlas --local
npm run seed
npm run dev
```

Open [http://localhost:5173/en](http://localhost:5173/en) or `/zh-hk`. `npm run seed -- --sample 2000` is a smaller local catalog.

1. Clustered pins, no login. Every place with coordinates is shown, including demolished ones.
2. Pan and zoom — clusters split.
3. Click a pin — site panel (names, dates, notes, sources, edges).
4. Click the map — nearby features in view.
5. Switch English / 繁.
6. Read-only — no Add or Edit without sign-in.

`npm run seed` imports the full [BDBIAR_BDBIAR_converted.csv](BDBIAR_BDBIAR_converted.csv). Catalog GeoJSON is written to `public/catalog.geojson` (gitignored).

## Deploy

```bash
npx wrangler d1 migrations apply hk-atlas --remote
npm run seed -- --remote
npm run deploy
```

Worker `hk-atlas` on custom domain [hkatlas.fyi](https://hkatlas.fyi) (and `www`), D1 `hk-atlas` (APAC). `workers.dev` redirects to the apex.

After deploy, add `https://hkatlas.fyi/api/auth/callback` (and JS origin `https://hkatlas.fyi`) to the Google OAuth client used for wiki sign-in.

D1 free tier has a daily row-write limit. Large seeds can exhaust it for the day (UTC midnight reset). Sign-in still works if the users-table upsert fails; wiki edits that write to D1 will need paid D1 or waiting until the limit resets.

## Google Analytics + Search Console

GA4 Measurement ID `G-NKVYYE1Y49` is set in `wrangler.jsonc` (`GA_MEASUREMENT_ID`). The Worker injects gtag on production HTML; SPA navigations send `page_path` pageviews.

### Search Console setup

1. Open [Google Search Console](https://search.google.com/search-console) with the same Google account that owns the GA4 property.
2. Add property → **Domain** → `hkatlas.fyi`.
3. Verify with the DNS TXT record on the Cloudflare zone **hkatlas.fyi** (DNS → TXT at `@`).
4. Sitemaps → submit `https://hkatlas.fyi/sitemap.xml`.
5. URL inspection → request indexing for `https://hkatlas.fyi/en` and `https://hkatlas.fyi/zh-hk`.
6. Link GA4: Search Console → Settings → Associations, and GA4 Admin → Product links → Search Console.

Fallback if DNS TXT is slow: URL-prefix property `https://hkatlas.fyi` verified via Google Analytics (gtag already on the homepage).

### After SEO discoverability deploy

1. Confirm view-source on `https://hkatlas.fyi/en` shows title `HK Atlas — Hong Kong history map of places`.
2. Confirm `https://hkatlas.fyi/en/about` and `/zh-hk/about` return HTML with Spatial History Database / 空間歷史資料庫 copy.
3. Confirm `og:image` points at `https://hkatlas.fyi/og.png` and that URL loads.
4. Search Console → Sitemaps → resubmit `https://hkatlas.fyi/sitemap.xml` if needed.
5. URL inspection → request indexing for `/en`, `/zh-hk`, `/en/about`, `/zh-hk/about`.
6. Optional: Bing Webmaster Tools → submit the same sitemap.

Positioning: HK Atlas is a Spatial History Database (空間歷史資料庫) — bilingual map of Hong Kong places over time.

## Layout

- `src/domain` — Feature, locale, catalog, site query, SEO
- `scripts/bdbiar.ts` — one-time Buildings Department CSV import for `npm run seed`
- `src/api` — Worker route parser + browser client
- `worker` — API, SEO HTML, robots/sitemap/llms, domain redirects
- `scripts/seed.ts` — CSV → D1 + GeoJSON
- `src/AtlasApp.tsx` — MapLibre map + year slider + site panel
