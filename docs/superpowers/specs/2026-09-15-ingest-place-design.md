# Place ingest from URL or text

## Goal

A Cursor project skill (`ingest-place`) turns a pasted Gwulo/Wikipedia/article URL or free text into one atlas Place plus optional site/institution relations. The agent drafts in chat, highlights missing or disputed fields, lets the user patch them, and writes JSON only after confirm. The app merges those files on load, same as Commons ingest.

## Non-goals

- Photo / Record ingest (Commons category skill stays separate).
- In-app “Add from URL” UI.
- Inventing later generations or Chinese names that the source does not give.
- Auto-writing JSON on first fetch.

## Workflow

1. Trigger: user pastes a URL, a block of text, or asks to ingest a place.
2. If the URL is a Wikimedia Commons **category**, follow `ingest-commons-category` instead.
3. Fetch or read the source. Gwulo and Wikipedia place pages use `npm run ingest:fetch -- <url>` (structured fields + coordinates). Other URLs are fetched as readable text. Pasted prose is used as-is.
4. Scan existing atlas Places: `src/storage/seed.ts`, `data/commons/*.json`, `data/ingest/*.json`, and `BDBIAR_Central_and_Western.csv` (name + nearby coordinates).
5. Show a **draft in chat** with three blocks: Missing / uncertain, Place, Decisions. Stop.
6. User may reply with supplements (coords, dates, chosen candidate, “leave X unknown”). Agent updates the draft and still does not write.
7. User confirms (and has chosen reuse / new / skip). Then write `data/ingest/<id>.json`. Skip writes nothing.

Confirm is allowed while highlighted fields remain empty, as long as the Place has a primary English name and a source URL. Remaining gaps stay null/empty in JSON.

## Draft template

```
## Missing / uncertain
- demolished: missing
- geometry: disputed — Gwulo pin vs comment alternative
- zh name: missing
- …

## Place
- id (proposed)
- names
- status
- built / demolished (year-only if the source used a default 1 Jan)
- geometry
- locationLabel
- notes (short; article body, not comment dump)
- sources

## Decisions
- Existing place: reuse `<id>` | new `<id>` | skip
- site_successor: `<id>` | none
- institution_successor: `<id>` | none
```

Every listed Place field is **filled**, **proposed**, or **missing**. Disputed items are proposed with labelled alternatives (A/B), not silently picked.

User supplements are applied in the next draft. Do not write until they say to confirm.

## What must be highlighted when empty or disputed

- names (en required to write; zh highlighted if absent — Wikipedia infobox Chinese name counts as filled)
- status
- built; demolished (do **not** treat demolished as missing when status is `standing`)
- geometry (lat/lng)
- locationLabel
- existing Place choice
- site_successor and institution_successor (or “none found”)

Optional if unknown: notes, tags, extra sources. The triggering URL is always a source.

## Source adapters

### Gwulo place page (`gwulo.com/node/<nid>`)

Parse:

- Title, including `[start–end]` years (`????` → unknown demolished).
- Current condition → `standing` / `demolished` / `unknown`.
- Date completed / Date closed / demolished.
- `1 Jan YYYY` with no other day/month evidence → `{ year }` only, not 1 January. Mark `circa` when the body is clearly approximate.
- “Later place(s) at this location” → site-successor **candidates**, matched by name to atlas Places. Do not create those later Places in this ingest.
- Leaflet point from Drupal settings JSON (`leaflet["leaflet-map"].features`).
- Short notes from the article body only.

Id when **new**: `gwulo-<nid>`. Custom field `gwuloNode` = nid.

### Wikipedia article (`en.wikipedia.org/wiki/…`, including other language editions)

Parse from the MediaWiki API / infobox, not the surrounding chrome:

- Title → English primary name. Infobox native/Chinese name → `zh-Hant` when it is traditional Chinese (e.g. 會德豐大廈). Do not machine-translate.
- Coordinates (page coordinates or infobox) → proposed pin. GeoJSON order is `[lng, lat]`.
- Completed / opened → `built`. Year-only is fine; if an existing atlas Place has a fuller date (BDBIAR occupied 1984-06-29 vs Wikipedia 1984), propose **keeping the fuller date** and note the Wikipedia year as corroboration. Highlight only when years disagree.
- Location / address → `locationLabel`.
- Infobox that reads as a current building → `standing`. Demolished is then “none”, not missing.
- Lead + History: short notes. “Built on the site of…” / previous generations → **candidates already in the atlas**, not new Places. Do not create Jardine House 2nd/3rd (etc.) from a standing-building article.
- “Wikimedia Commons has media related to…” and Wikidata item → extra `sources` only. Do not ingest Commons files here; if the user wants photos, point them at `ingest-commons-category`.

Id when **new**: `wiki-<slug>`. Custom field `wikipediaTitle` = the article title.

Reference page: [Wheelock House](https://en.wikipedia.org/wiki/Wheelock_House).

### Other URL or pasted text

Extract the same fields from the readable text. Propose a pin from explicit coordinates, else from a geocodable location label, else missing. Same highlight + supplement rules.

## Identity

Always present existing-place candidates and wait for reuse / new / skip:

- Same source URL already on a Place.
- Same primary name and nearby pin (about 25 m, or name match against BDBIAR / seed).

Reuse writes JSON with that existing `id` so merge updates names/dates/notes/sources and keeps claimed lots/buildings/geometry when the user has already drawn them.

New uses `gwulo-<nid>`, `wiki-<slug>`, or `ingest-<slug-from-en-name>`.

Skip writes nothing.

## Relations

Propose at most one `site_successor` and one `institution_successor` from this Place:

- Site: later building on the same ground (Gwulo “Later place(s)”, or standing BDBIAR/seed Place at the chosen pin).
- Institution: named organisation that moved (e.g. GPO chain). Same-site clustering is not an institution link.

When the ingested Place **is** the current building (Wikipedia Wheelock House), `site_successor` from this Place is usually none. List earlier-on-site atlas Places (e.g. `commons-jardine-house-1st-generation`) as context. If that earlier Place has no `site_successor` to this id yet, propose adding that relation (`fromId` = earlier, `toId` = this). Still do not create the missing generations.

Do not invent targets. If none, say so. User can override or clear before confirm. Photos are not ingested.

## Geometry and other gaps

`Place.geometry` may be null. Unlocated Places merge into the store but are omitted from the map and from click-to-site queries. The in-app editor still requires a pin, parcel, or footprint before a manual save — the user can add one later.

If sources disagree, list alternatives (e.g. Gwulo pin vs Volunteer HQ / CGO East Wing vs cathedral grounds) and wait. A Gwulo Leaflet pin is the default **proposal**, not an automatic lock.

`built` and `demolished` stay `null` when unknown. Status may still be `demolished` from the source condition without a demolition year.

## Persistence

Write only after confirm:

`data/ingest/<id>.json` as `PlaceIngest`:

```ts
type PlaceIngest = {
  place: Place          // geometry may be null
  relations: Relation[] // 0–2 items
}
```

Same id overwrites the same file. `records` are out of scope (omit or `[]`).

App loads `data/ingest/*.json` on startup and merges like Commons: insert or update by id; keep previous `lots`, `buildings`, and user geometry when those exist; keep `createdAt`.

Shared merge helper lives in `src/domain/ingest.ts`. Commons ingest keeps its folder and photo records; it may call the same merge for the place + relation portion so two pipelines do not drift.

## Skill

Path: `.cursor/skills/ingest-place/SKILL.md`

Auto-invoke when the user pastes a place URL (gwulo.com, wikipedia.org), asks to ingest/import a place, or pastes historical prose to turn into a Place. Do not set `disable-model-invocation`.

The skill states the draft template, the confirm gate, `ingest:fetch` command, existing-place scan paths, Wikipedia infobox rules, and “never invent earlier/later generations from a history paragraph.”

## Helpers

- `scripts/fetch-place-source.ts` + `npm run ingest:fetch -- <url>` dispatches on host:
  - Gwulo → title, condition, dates, later-place titles, Leaflet lat/lng, extract.
  - Wikipedia → title, zh name, coordinates, completed, location, extract, wikidata/commons source URLs.
- `src/domain/gwulo.ts` / `src/domain/wikipedia.ts`: `gwuloPlaceId`, `wikiPlaceId`, date normalisation (`1 Jan` → year-only), infobox/Leaflet parse into the chat draft fields.

Generic URLs have no extra parser; the agent fills the same draft shape from fetched markdown.

## Errors

- Fetch fail: stop, show the error, no draft file.
- Not a place page (Gwulo photo, person, street; Wikipedia disambiguation or non-building article): say so; do not invent a Place.
- Confirm with no English name or no source URL: refuse to write.
- Reuse id that is not in the candidate list: ask again.

## Tests

- Gwulo fixture for node 3034: title, demolished 1911-06-19 / 1977, Leaflet `114.157785, 22.282456`, later place “World Wide House”.
- Node 6593: demolished status, demolished date missing, Leaflet pin `114.159907, 22.278816`, no later-place field.
- `1 Jan 1841` → `{ year: 1841 }` not month/day.
- Merge: reuse id keeps claimed lots; null geometry is allowed; relations upsert by id.
- Map/site helpers skip null geometry without throwing.
- Wikipedia fixture for Wheelock House: en + 會德豐大廈, standing, built 1984, pin `[114.1574, 22.2819]`, location Pedder Street / Central.

Manual check after implementation: paste both Gwulo URLs and [Wheelock House](https://en.wikipedia.org/wiki/Wheelock_House); expect 3034 → reuse `gpo-connaught` or skip; 6593 → new with missing demolished date; Wikipedia → reuse `bdbiar-1533660` (enrich source/names, keep BDBIAR 1984-06-29 unless the user overrides).

## Examples

[Gwulo 3034](https://gwulo.com/node/3034) — already `gpo-connaught`. Draft offers reuse / new `gwulo-3034` / skip. Site successor candidate: World Wide House. Institution already in seed; propose only if missing.

[Gwulo 6593](https://gwulo.com/node/6593) — new. Demolished date missing. Pin proposed from Gwulo (`114.159907, 22.278816`) with comment alternatives. Institution successor candidate: `gpo-queens-rd` if the user agrees the 1846 Queen’s Road move is that Place.

[Wheelock House](https://en.wikipedia.org/wiki/Wheelock_House) — standing current building. Infobox fills en/zh names, 1984, `[114.1574, 22.2819]`. Existing candidate: BDBIAR `bdbiar-1533660` (20 Pedder St, occupied 1984-06-29, nearby pin). History names three Jardine House generations: match `commons-jardine-house-1st-generation` if present; do **not** create the other generations. `site_successor` from Wheelock is none; if Jardine 1st gen has no successor to this id, propose that link. Commons category on the article is a source link only.
