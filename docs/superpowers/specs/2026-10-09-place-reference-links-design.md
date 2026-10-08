# Place reference links

## Goal

Let any signed-in user add several reference links to a place. When a URL is pasted into the editor, the Worker fetches the page’s title, site name and icon. The user can correct the title, and everything is saved with the place. The place aside shows each link as a compact row with icon, title and site name.

## Bug fix

`wikiDraftToWrite` previously always sent empty `sources`, `images`, `tags` and `customFields`. Editing a place therefore wiped catalog fields (e.g. BDBIAR sources). The draft now carries `sources`, and `wikiDraftToWrite(draft, base?)` preserves `images` / `tags` / `customFields` / district / region from `base`.

## Data model

```ts
type Source = {
  label?: string    // display title (editable)
  url?: string
  siteName?: string // og:site_name or hostname
  icon?: string     // absolute https icon URL
}
```

Server `parseSources` keeps only `http(s)` URLs, https icons, caps lengths, and allows at most 20 links.

## Preview

`GET /api/links/preview?url=` (signed in):

- Fetches HTML (5s timeout, 256KB, `text/html` only)
- Parses `og:title` / `<title>`, `og:site_name`, favicon via `parseLinkMeta`
- Caches successful results for 1 day

## Editor

Reference-links fieldset: URL + title per row, preview on paste/blur, Add/Remove, max 20. Invalid non-http(s) URLs block save.

## Aside

Compact row: 16px icon (globe fallback), title, muted site name / domain. Links use `rel="nofollow ugc noopener noreferrer"`. SSR HTML uses the same `rel`.

## Out of scope

Discussion threads / Lemmy, icon proxy, native comments.
