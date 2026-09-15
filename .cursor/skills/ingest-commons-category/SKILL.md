---
name: ingest-commons-category
description: Ingest a Wikimedia Commons category into HK Place Atlas as a named-generation Place plus photo Records. Use when the user pastes a commons.wikimedia.org Category URL, asks to import Commons photos, or mentions Commons category ingest.
---

# Ingest Commons category

PoC workflow. Draft in chat first. Write `data/commons/<id>.json` only after the user approves.

## Steps

1. Run:

```bash
npm run commons:fetch -- '<category-url>'
```

2. Read existing current-site candidates: `src/storage/seed.ts`, `data/commons/*.json`, and `BDBIAR_Central_and_Western.csv` (name + nearby coordinates). Do not invent later generations from the caption.

3. Show a draft in chat:

- **Place** — named generation only (`commonsPlaceId(url)`). Point from Commons coords. Dates/notes from the extract, marked circa when the text is uncertain. Source = category URL.
- **Current site** — standing Place already in the atlas at that spot (e.g. BDBIAR Wheelock House `bdbiar-1533660`). Propose `site_successor` from the new Place to that id. If none, say so and skip the relation.
- **Files** — every file as keep or drop with a one-line reason. Keep only when the named generation is a reasonable subject.

4. Stop. Wait for keep/drop edits and approval.

5. After approval, write `data/commons/<commonsPlaceId>.json` as `CommonsIngest` (`src/domain/commons.ts`):

- `place.id` = `commonsPlaceId(url)`
- kept files → `records` (`commonsFileId(title)`), `urls` = Commons file page, notes = artist + license + date, `links` = `{ kind: 'place', placeId }`
- `place.images` = kept file page URLs
- `relation` only if the user confirmed a current-site id
- timestamps ISO; status `demolished` if the extract says it was rebuilt/replaced

6. Do not write JSON until the user says to. Same category id updates the same file.

## Helpers

`commonsPlaceId` and `commonsFileId` live in `src/domain/commons.ts`. The app merges every `data/commons/*.json` on load.