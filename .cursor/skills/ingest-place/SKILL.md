---
name: ingest-place
description: Ingest a Gwulo, Wikipedia, or other place URL (or pasted historical text) into HK Place Atlas as one Place plus optional site/institution relations. Use when the user pastes a gwulo.com or wikipedia.org place page, asks to import/ingest a place, or pastes prose to turn into a Place. Commons category URLs use ingest-commons-category instead.
---

# Ingest place from URL or text

Draft in chat first. Write `data/ingest/<id>.json` only after the user confirms. Photos are out of scope.

## Steps

1. If the URL is a Wikimedia Commons **category**, follow `ingest-commons-category` instead.

2. Fetch:

```bash
npm run ingest:fetch -- '<url>'
```

Gwulo and Wikipedia are supported. For any other URL, fetch readable text. For pasted prose, use the paste as-is.

3. Scan existing Places: `src/storage/seed.ts`, `data/commons/*.json`, `data/ingest/*.json`, and `BDBIAR_Central_and_Western.csv` (name + nearby coordinates). Do not invent earlier or later generations from a history paragraph.

4. Show a draft in chat with three blocks. Stop.

```
## Missing / uncertain
- demolished: missing
- geometry: disputed — A vs B
- zh name: missing

## Place
- id
- names
- status
- built / demolished
- geometry
- locationLabel
- notes (short; article body, not comments)
- sources

## Decisions
- Existing place: reuse `<id>` | new `<id>` | skip
- site_successor: `<id>` | none
- institution_successor: `<id>` | none
```

Mark every field **filled**, **proposed**, or **missing**. Disputed pins get labelled alternatives. Gwulo Leaflet coords are the default proposal, not a lock.

Highlight when empty: en/zh names, status, built, demolished (not when status is `standing`), geometry, locationLabel, existing-place choice, both relations (or “none found”).

5. User may supplement gaps (“leave demolished unknown”, pick pin A, reuse id). Update the draft. Do not write yet.

6. After they confirm **and** choose reuse / new / skip:

- Skip → write nothing.
- Reuse → `place.id` is the existing id.
- New → `gwulo-<nid>`, `wiki-<slug>`, or `ingest-<slug>`.

Write `data/ingest/<id>.json` as `PlaceIngest` (`src/domain/ingest.ts`): `{ place, relations }`. Geometry may be null. Confirm is allowed with gaps if there is an English name and a source URL. Same id overwrites the same file.

## Source rules

- **Gwulo** — title without `[years]`; `1 Jan YYYY` → year only; later-place titles are site-successor **candidates** (match existing Places, do not create them); custom field `gwuloNode`.
- **Wikipedia** — infobox native Chinese name if present; keep a fuller existing date (e.g. BDBIAR 1984-06-29 vs Wikipedia 1984) unless years disagree; Commons/Wikidata are extra sources, not photo ingest; custom field `wikipediaTitle`.
- Standing current buildings usually have no `site_successor` from this Place. If an earlier atlas Place on the same site has no successor to this id, propose that relation (`fromId` = earlier).

## Helpers

`gwuloPlaceId`, `parseGwuloPlaceHtml` (`src/domain/gwulo.ts`); `wikiPlaceId`, `parseWikipediaPlace` (`src/domain/wikipedia.ts`); `ingestGaps`, `mergePlaceIngests` (`src/domain/ingest.ts`). The app merges every `data/ingest/*.json` on load.
