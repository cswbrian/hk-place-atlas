# SEO History Map Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make hkatlas.fyi discoverable for “hong kong history map/place” queries by framing HK Atlas as a Spatial History Database / 空間歷史資料庫, with brand-first titles, About pages, OG image, and Search Console docs.

**Architecture:** Keep the existing Worker SSR SEO pipeline (`parseSeoPath` → `*SeoHead` → `injectSeoHead`). Add locale strings for SEO titles/descriptions and About copy; extend `SeoPath` with `about`; serve richer crawler HTML; inject absolute `og:image` from `PUBLIC_ORIGIN/og.png`; render a client About view at `/{locale}/about`.

**Tech Stack:** TypeScript, Vitest, Cloudflare Worker + Vite SPA, schema.org JSON-LD, static `public/og.png`.

**Spec:** `docs/superpowers/specs/2026-10-07-seo-history-map-discoverability-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `src/domain/locale.ts` | Brand + SEO title/description + About copy + “About” nav label |
| `src/domain/seo.ts` | About path, heads, crawler HTML, OG image tags, sitemap `/about`, `llms.txt` |
| `src/domain/seo.test.ts` | SEO unit tests |
| `src/domain/locale.test.ts` | About path helpers if added |
| `worker/index.ts` | SSR branch for About |
| `src/ui/AboutPage.tsx` | About page UI |
| `src/AtlasApp.tsx` | Route `/about`, header link |
| `src/index.css` | Minimal About layout styles |
| `public/og.png` | Default share image (~1200×630) |
| `README.md` | Search Console / post-deploy checklist |

---

### Task 1: Locale SEO + About copy strings

**Files:**
- Modify: `src/domain/locale.ts`
- Modify: `src/domain/seo.test.ts` (only if a test imports tagline for home title — update in Task 2)
- Test: none yet (strings consumed in Task 2)

- [ ] **Step 1: Add SEO and About fields to both locales**

In `src/domain/locale.ts`, keep `title` and `tagline` for UI. Add:

```ts
// en
seoTitle: 'HK Atlas — Hong Kong history map of places',
seoDescription:
  'Spatial history database — an interactive map of Hong Kong’s historical places: buildings, shops, and events over time.',
category: 'Spatial History Database',
aboutNav: 'About',
aboutHeading: 'About HK Atlas',
aboutLead:
  'HK Atlas is a spatial history database of Hong Kong places — buildings, shops, and events — on an interactive map over time.',
aboutBullets: [
  'Browse clustered places on the map; open a pin for names, dates, notes, and sources.',
  'English and 繁體中文; standing and demolished places alike.',
  'Sign in to add places, photos, and edits.',
],
aboutDiffers:
  'Unlike historical paper-map overlays or archive portals, HK Atlas is a structured place record you can explore and improve.',
aboutBack: 'Back to map',
aboutSeoTitle: 'About HK Atlas — Hong Kong history map',
aboutSeoDescription:
  'About HK Atlas, a spatial history database and interactive map of Hong Kong’s historical places.',

// zh-hk
seoTitle: '香港地圖集 — 歷史地圖',
seoDescription: '空間歷史資料庫 — 香港歷史地方互動地圖，涵蓋樓宇、店舖與事件。',
category: '空間歷史資料庫',
aboutNav: '關於',
aboutHeading: '關於香港地圖集',
aboutLead:
  '香港地圖集是一個空間歷史資料庫，以互動地圖記錄香港地方——樓宇、店舖與事件——隨時間演變。',
aboutBullets: [
  '在地圖上瀏覽聚類地點；點選標記查看名稱、年份、備註與來源。',
  '支援英文與繁體中文；包括現存與已拆卸的地方。',
  '登入後可新增地方、照片與編輯。',
],
aboutDiffers:
  '有別於舊地圖疊加或檔案庫入口，香港地圖集是可供探索與協作的結構化地方紀錄。',
aboutBack: '返回地圖',
aboutSeoTitle: '關於香港地圖集 — 歷史地圖',
aboutSeoDescription: '關於香港地圖集：空間歷史資料庫，香港歷史地方的互動地圖。',
```

TypeScript will infer the wider `copy` shape from both locale objects; keep `en` and `zh-hk` keys identical.

- [ ] **Step 2: Commit**

```bash
git add src/domain/locale.ts
git commit -m "$(cat <<'EOF'
Add locale copy for SEO titles and About page.

EOF
)"
```

---

### Task 2: Home SEO titles, descriptions, richer crawler body

**Files:**
- Modify: `src/domain/seo.ts`
- Modify: `src/domain/seo.test.ts`

- [ ] **Step 1: Write failing tests for home SEO**

Replace the `homeSeoHead` test in `src/domain/seo.test.ts`:

```ts
describe('homeSeoHead', () => {
  it('uses brand-first keyword titles and spatial-history descriptions', () => {
    const en = homeSeoHead('https://hkatlas.fyi', 'en')
    expect(en.title).toBe('HK Atlas — Hong Kong history map of places')
    expect(en.description).toMatch(/Spatial history database/i)
    expect(en.siteName).toBe('HK Atlas')
    expect(en.crawlerBody).toContain('<h1>HK Atlas</h1>')
    expect(en.crawlerBody).toMatch(/spatial history database/i)
    expect(en.crawlerBody).toContain('/en/about')

    const zh = homeSeoHead('https://hkatlas.fyi', 'zh-hk')
    expect(zh.title).toBe('香港地圖集 — 歷史地圖')
    expect(zh.description).toContain('空間歷史資料庫')
    expect(zh.siteName).toBe('香港地圖集')
    expect(zh.crawlerBody).toContain('<h1>香港地圖集</h1>')
    expect(zh.crawlerBody).toContain('空間歷史資料庫')
    expect(zh.crawlerBody).toContain('/zh-hk/about')
  })
})
```

Update `homeJsonLd` test to expect the new description substring:

```ts
expect(homeJsonLd('https://hkatlas.fyi', 'en').description).toMatch(/Spatial history database/i)
expect(homeJsonLd('https://hkatlas.fyi', 'zh-hk').description).toContain('空間歷史資料庫')
```

Update `llmsTxt` test:

```ts
expect(body).toMatch(/Spatial History Database/i)
expect(body).toContain('空間歷史資料庫')
expect(body).toContain('/en/about')
```

Update `crawlerBodyHtml` home coverage if missing — add:

```ts
it('frames the home page as a spatial history database', () => {
  const en = crawlerBodyHtml({ type: 'home', locale: 'en' })
  expect(en).toMatch(/spatial history database/i)
  expect(en).toContain('href="/en/about"')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/seo.test.ts`

Expected: FAIL on home title still being `HK Atlas` / missing About link / missing category phrase.

- [ ] **Step 3: Implement home SEO + crawler + llms**

In `src/domain/seo.ts`:

1. `homeSeoHead`: `title: copy[locale].seoTitle`, `description: copy[locale].seoDescription` (keep `siteName: copy[locale].title`).

2. `homeJsonLd`: `description: copy[locale].seoDescription`. Optionally add `additionalType` or keep `WebSite` only — do not rename brand `name`.

3. `crawlerBodyHtml` for `home`:

```ts
const text = copy[input.locale]
const aboutHref = `/${input.locale}/about`
const bullets = text.aboutBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')
return [
  `<main>`,
  `<h1>${escapeHtml(text.title)}</h1>`,
  `<p>${escapeHtml(text.aboutLead)}</p>`,
  `<ul>${bullets}</ul>`,
  `<p><a href="${escapeHtml(aboutHref)}">${escapeHtml(text.aboutNav)}</a></p>`,
  `</main>`,
].join('')
```

4. `llmsTxt`: lead with category:

```ts
'# HK Atlas · 香港地圖集',
'',
'> Spatial History Database / 空間歷史資料庫 — bilingual map of Hong Kong buildings, shops, and events over time.',
'',
`- English: ${base}/en`,
`- 繁體中文: ${base}/zh-hk`,
`- About: ${base}/en/about · ${base}/zh-hk/about`,
// ... existing place/event/sitemap lines
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/seo.test.ts`

Expected: PASS for home/llms/crawler changes (About path tests still fail if added early — keep About tests in Task 3).

- [ ] **Step 5: Commit**

```bash
git add src/domain/seo.ts src/domain/seo.test.ts
git commit -m "$(cat <<'EOF'
Use spatial-history SEO titles and richer home crawler HTML.

EOF
)"
```

---

### Task 3: About SEO path, head, sitemap, Worker

**Files:**
- Modify: `src/domain/seo.ts`
- Modify: `src/domain/seo.test.ts`
- Modify: `worker/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
it('reads about pages', () => {
  expect(parseSeoPath('/en/about')).toEqual({ type: 'about', locale: 'en' })
  expect(parseSeoPath('/zh-hk/about')).toEqual({ type: 'about', locale: 'zh-hk' })
  expect(parseSeoPath('/en/about/extra')).toBeNull()
})
```

```ts
describe('aboutSeoHead', () => {
  it('indexes About with brand-first titles and AboutPage JSON-LD', () => {
    const en = aboutSeoHead('https://hkatlas.fyi', 'en')
    expect(en.title).toBe('About HK Atlas — Hong Kong history map')
    expect(en.canonical).toBe('https://hkatlas.fyi/en/about')
    expect(en.robots).toBe('index,follow')
    expect(en.jsonLd).toMatchObject({
      '@type': 'AboutPage',
      url: 'https://hkatlas.fyi/en/about',
    })
    expect(en.crawlerBody).toMatch(/spatial history database/i)
    expect(en.crawlerBody).toContain('Back to map')

    const zh = aboutSeoHead('https://hkatlas.fyi', 'zh-hk')
    expect(zh.title).toBe('關於香港地圖集 — 歷史地圖')
    expect(zh.canonical).toBe('https://hkatlas.fyi/zh-hk/about')
    expect(zh.crawlerBody).toContain('空間歷史資料庫')
  })
})
```

In `sitemapXml` test, expect About URLs:

```ts
expect(xml).toContain('<loc>https://hkatlas.fyi/en/about</loc>')
expect(xml).toContain('<loc>https://hkatlas.fyi/zh-hk/about</loc>')
```

When `includeHomes: false`, About must also be omitted (homes chunk only).

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/domain/seo.test.ts`

- [ ] **Step 3: Implement About SEO**

In `src/domain/seo.ts`:

```ts
export type SeoAbout = { type: 'about'; locale: SiteLocale }
export type SeoPath = SeoHome | SeoFeature | SeoAbout
```

`parseSeoPath`: after home check, if `rest === '/about'` return `{ type: 'about', locale }`.

```ts
export function aboutJsonLd(origin: string, locale: SiteLocale) {
  const text = copy[locale]
  return {
    '@context': 'https://schema.org' as const,
    '@type': 'AboutPage' as const,
    name: text.aboutSeoTitle,
    description: text.aboutSeoDescription,
    url: `${origin}/${locale}/about`,
    inLanguage: htmlLang(locale),
    isPartOf: { '@type': 'WebSite' as const, name: text.title, url: `${origin}/${locale}` },
    about: {
      '@type': 'Thing' as const,
      name: text.category,
    },
  }
}

export function aboutSeoHead(origin: string, locale: SiteLocale): SeoHead {
  const text = copy[locale]
  return {
    lang: htmlLang(locale),
    title: text.aboutSeoTitle,
    description: text.aboutSeoDescription,
    robots: 'index,follow',
    canonical: `${origin}/${locale}/about`,
    alternates: hreflangLinks(origin, '/about'),
    jsonLd: aboutJsonLd(origin, locale),
    ogType: 'website',
    ogLocale: OG_LOCALE[locale],
    ogLocaleAlternate: ogLocaleAlternate(locale),
    siteName: siteName(locale),
    crawlerBody: crawlerBodyHtml({ type: 'about', locale }),
  }
}
```

Extend `crawlerBodyHtml` input with `{ type: 'about'; locale }`:

```ts
if (input.type === 'about') {
  const text = copy[input.locale]
  const mapHref = `/${input.locale}`
  const bullets = text.aboutBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')
  return [
    `<main>`,
    `<h1>${escapeHtml(text.aboutHeading)}</h1>`,
    `<p>${escapeHtml(text.aboutLead)}</p>`,
    `<ul>${bullets}</ul>`,
    `<p>${escapeHtml(text.aboutDiffers)}</p>`,
    `<p><a href="${escapeHtml(mapHref)}">${escapeHtml(text.aboutBack)}</a></p>`,
    `</main>`,
  ].join('')
}
```

In `sitemapXml`, when `includeHomes`, after `pushPair('')` also `pushPair('/about')`.

In `worker/index.ts` `handleSeoPage`:

```ts
if (seo.type === 'home') return html(injectSeoHead(shell, homeSeoHead(origin, seo.locale), measurementId))
if (seo.type === 'about') return html(injectSeoHead(shell, aboutSeoHead(origin, seo.locale), measurementId))
```

Import `aboutSeoHead`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/domain/seo.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/domain/seo.ts src/domain/seo.test.ts worker/index.ts
git commit -m "$(cat <<'EOF'
Add About page SSR SEO and sitemap entries.

EOF
)"
```

---

### Task 4: Feature description fallback

**Files:**
- Modify: `src/domain/seo.ts`
- Modify: `src/domain/seo.test.ts`

- [ ] **Step 1: Write failing test**

```ts
it('falls back to a Hong Kong place description when notes are empty', () => {
  const empty = { ...stub, body: { ...stub.body, notes: '' } }
  const en = featureSeoHead(empty, 'https://hkatlas.fyi', 'en')
  expect(en.description).toBe('HIGH HOUSE — historical place in Hong Kong on HK Atlas')
  const zh = featureSeoHead(empty, 'https://hkatlas.fyi', 'zh-hk')
  expect(zh.description).toBe('金高大廈 — 香港地圖集上的香港歷史地方')
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/domain/seo.test.ts -t "falls back"`

- [ ] **Step 3: Implement**

In `featureSeoHead`:

```ts
const name = featureName(feature, locale)
const fallback =
  locale === 'zh-hk'
    ? `${name} — 香港地圖集上的香港歷史地方`
    : `${name} — historical place in Hong Kong on HK Atlas`
const description = feature.body.notes.trim() || fallback
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/domain/seo.ts src/domain/seo.test.ts
git commit -m "$(cat <<'EOF'
Add keyword-aware feature meta description fallback.

EOF
)"
```

---

### Task 5: Default OG image tags

**Files:**
- Modify: `src/domain/seo.ts`
- Modify: `src/domain/seo.test.ts`
- Create: `public/og.png`

- [ ] **Step 1: Write failing injectSeoHead expectations**

Add `ogImage` to the head object in the existing `injectSeoHead` test:

```ts
ogImage: 'https://atlas.example/og.png',
```

Expect:

```ts
expect(html).toContain('property="og:image" content="https://atlas.example/og.png"')
expect(html).toContain('name="twitter:image" content="https://atlas.example/og.png"')
expect(html).toContain('name="twitter:card" content="summary_large_image"')
```

Add to `homeSeoHead` test:

```ts
expect(en.ogImage).toBe('https://hkatlas.fyi/og.png')
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement SeoHead.ogImage + inject tags**

```ts
export type SeoHead = {
  // ...existing
  ogImage: string
}
```

Helper:

```ts
function ogImageUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/og.png`
}
```

Set `ogImage: ogImageUrl(origin)` in `homeSeoHead`, `aboutSeoHead`, `featureSeoHead`, `notFoundSeoHead`.

In `injectSeoHead` tags array, after site_name:

```ts
`<meta property="og:image" content="${escapeHtml(head.ogImage)}" />`,
`<meta name="twitter:card" content="summary_large_image" />`,
`<meta name="twitter:image" content="${escapeHtml(head.ogImage)}" />`,
```

Remove the old `twitter:card` `summary` line.

- [ ] **Step 4: Create `public/og.png`**

Create a ~1200×630 PNG with:

- Background: dark ink / map-ish (avoid purple gradient cliché)
- Text: `HK Atlas` / `香港地圖集`
- Subline: `Spatial History Database` / `空間歷史資料庫`

Options during implementation: Cursor GenerateImage, or a one-off Node canvas/sharp script checked in only as the PNG. Commit the binary under `public/og.png` (Vite serves `/og.png`).

- [ ] **Step 5: Run tests — expect PASS**

Run: `npx vitest run src/domain/seo.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/domain/seo.ts src/domain/seo.test.ts public/og.png
git commit -m "$(cat <<'EOF'
Add default Open Graph share image tags.

EOF
)"
```

---

### Task 6: About page UI + routing

**Files:**
- Create: `src/ui/AboutPage.tsx`
- Modify: `src/AtlasApp.tsx`
- Modify: `src/index.css`
- Optional test: `src/ui/AboutPage.test.ts` (DOM string assertions if the project tests UI that way)

- [ ] **Step 1: Add `AboutPage` component**

```tsx
import { copy, type SiteLocale } from '../domain/locale'

export function AboutPage({
  locale,
  onBack,
}: {
  locale: SiteLocale
  onBack: () => void
}) {
  const text = copy[locale]
  return (
    <main className="about-page" lang={locale === 'zh-hk' ? 'zh-Hant' : 'en'}>
      <h2>{text.aboutHeading}</h2>
      <p className="about-category">{text.category}</p>
      <p>{text.aboutLead}</p>
      <ul>
        {text.aboutBullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>{text.aboutDiffers}</p>
      <p>
        <a
          href={`/${locale}`}
          onClick={(event) => {
            event.preventDefault()
            onBack()
          }}
        >
          {text.aboutBack}
        </a>
      </p>
    </main>
  )
}
```

- [ ] **Step 2: Wire AtlasApp**

When `rest === '/about'`:

- Still render header chrome
- Skip map workspace; render `<AboutPage locale={locale} onBack={() => go(`/${locale}`)} />`
- Do not run `defaultPlaceRedirect` for `/about` (it already only fires when `rest === '/'`)

In header, after brand or before language switch:

```tsx
<a
  href={`/${locale}/about`}
  className="chrome-about"
  aria-current={rest === '/about' ? 'page' : undefined}
  onClick={(event) => {
    event.preventDefault()
    go(`/${locale}/about`)
  }}
>
  {text.aboutNav}
</a>
```

Language switch already uses `switchLocalePath` — `/en/about` ↔ `/zh-hk/about` works with no change.

- [ ] **Step 3: CSS**

In `src/index.css`, add compact About styles (reuse chrome fonts/colors; max-width readable column; padding). No card chrome unless needed for readability.

- [ ] **Step 4: Manual smoke**

Run: `npm run dev`  
Open `http://localhost:5173/en/about` and `/zh-hk/about`. Confirm header About link, language switch, back to map.  
With Worker SEO: curl `http://localhost:8787/en/about` (or the proxy path your setup uses) and confirm `<title>` and crawler `<main>`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/AboutPage.tsx src/AtlasApp.tsx src/index.css
git commit -m "$(cat <<'EOF'
Add About page UI and header navigation.

EOF
)"
```

---

### Task 7: README Search Console checklist + verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Extend the existing “Google Analytics + Search Console” section**

Add under Search Console setup:

```markdown
### After SEO discoverability deploy

1. Confirm view-source on `https://hkatlas.fyi/en` shows title `HK Atlas — Hong Kong history map of places`.
2. Confirm `https://hkatlas.fyi/en/about` and `/zh-hk/about` return HTML with Spatial History Database / 空間歷史資料庫 copy.
3. Confirm `og:image` points at `https://hkatlas.fyi/og.png` and that URL loads.
4. Search Console → Sitemaps → resubmit `https://hkatlas.fyi/sitemap.xml` if needed.
5. URL inspection → request indexing for `/en`, `/zh-hk`, `/en/about`, `/zh-hk/about`.
6. Optional: Bing Webmaster Tools → submit the same sitemap.

Positioning: HK Atlas is a Spatial History Database (空間歷史資料庫) — bilingual map of Hong Kong places over time.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
Document Search Console steps for history-map SEO.

EOF
)"
```

- [ ] **Step 3: Full test suite**

Run: `npm test`

Expected: PASS

- [ ] **Step 4: Deploy when ready**

```bash
npm run deploy
```

Then run the README post-deploy checks (operator does Search Console UI).

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Brand-first home titles EN/ZH | 1–2 |
| Spatial history meta descriptions | 1–2 |
| Richer home crawler + About link | 2 |
| JSON-LD / llms.txt framing | 2 |
| Feature description fallback | 4 |
| `/en/about` + `/zh-hk/about` SSR + sitemap | 3 |
| About UI + header link | 6 |
| `og.png` + OG/Twitter tags | 5 |
| README Search Console checklist | 7 |

## Self-review notes

- No TBD placeholders; About JSON-LD is `AboutPage`.
- `SeoHead` gains `ogImage` — all four head builders must set it (Task 5).
- Sitemap About URLs only when `includeHomes` is true (page 0 / single-file sitemap).
